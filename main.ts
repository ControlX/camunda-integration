import { ZBClient } from 'zeebe-node'
import { config } from 'dotenv';
import express from 'express';
import axios, { AxiosResponse } from 'axios';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger/openapi.json'

config();

let zbc: ZBClient;
const app = express();
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

let workersOutput: any = {};

app.delete('/quote/product', async function (req, res) {
    workersOutput = {};
    res.send({"success": "All Products Deleted!"});
})

app.get('/quote/product/:search', async function (req, res) {
    try {
        zbc = new ZBClient();
        const deployFiles = ['./modeler/one-victor-quote-bpmn.bpmn']
        
        await zbc.deployProcess(deployFiles)

        const result = await zbc.createProcessInstance('one-victor-search-orchestration', {
            message_content: 'Camunda started from NodeJS!!!'
        })

        workersOutput[result.processInstanceKey] = {};

        const product = req.params.search;
        await processProduct(product);
        processVictorGateway();
        processBrizaGateway();
        processCarrierYGateway();
        processOutcome(res);

        res.send("Quotes generation under process with quote_request_id: " + result.processInstanceKey);
    }
    catch (err) {
        console.log(err);
    }
})

app.get('/quote/:quote_id', async function (req, res) {
    res.send(workersOutput[req.params.quote_id]);
})

app.get('/quote', async function (req, res) {
    res.send(workersOutput);
})

app.listen(3000, '0.0.0.0', function() {
    console.log("Server running on port 3000");
})

interface ProcessPayload {
    product: string,
    response: AxiosResponse,
    output: object,
    message_content: string
}

function processProduct(product: any) {
    zbc.createWorker<ProcessPayload, {}, Partial<ProcessPayload>>({
        taskType: 'select-product-input',
        taskHandler: job => {
            return job.complete({ product })
        }
    })
}

function processVictorGateway() {
    zbc.createWorker<ProcessPayload, {}, Partial<ProcessPayload>>({
        taskType: 'victor_worker',
        taskHandler: async job => {
            let output: any = {}
            try {
                const response = await axios.get('https://vz1z84zy6f.execute-api.us-west-2.amazonaws.com/quote/fd2cd0b6-aab7-4989-91cb-9a1b318ba6af');
                output.victor = {};
                output.victor = response.data;
                output.victor.product.product_type = job.variables.product;
                output.victor.product.description = (job.variables.product).toUpperCase() + " INSURANCE";
                output.victor.product.product_description = job.variables.product;
                workersOutput[job.processInstanceKey]["victor"] = response.data;
                return job.complete(output)
            } catch (error) {
                console.error(error);
                return job.error("Failed in Victor Gateway");
            }
        }
    })
}

function processCarrierYGateway() {
    zbc.createWorker<ProcessPayload, {}, Partial<ProcessPayload>>({
        taskType: 'carrier_y_worker',
        taskHandler: async job => {
            let output: any = {}
            try {
                const response = await axios.get('https://vz1z84zy6f.execute-api.us-west-2.amazonaws.com/quote/fd2cd0b6-aab7-4989-91cb-9a1b318ba6af');
                output.carrier_y = {};
                output.carrier_y = response.data;
                output.carrier_y.product.product_type = job.variables.product;
                output.carrier_y.product.description = (job.variables.product).toUpperCase() + " INSURANCE";
                output.carrier_y.product.product_description = job.variables.product;
                workersOutput[job.processInstanceKey]["carrier_y"] = response.data;
                return job.complete(output)
            } catch (error) {
                console.error(error);
                return job.error("Failed in Carrier Y Gateway");
            }
        }
    })
}

function processBrizaGateway() {
    zbc.createWorker<ProcessPayload, {}, Partial<ProcessPayload>>({
        taskType: 'briza_worker',
        taskHandler: async job => {
            let output: any = {}
            try {
                const response = await axios.get('https://vz1z84zy6f.execute-api.us-west-2.amazonaws.com/quote/fd2cd0b6-aab7-4989-91cb-9a1b318ba6af');
                output.briza = {};
                output.briza = response.data;
                output.briza.product.product_type = job.variables.product;
                output.briza.product.description = (job.variables.product).toUpperCase() + " INSURANCE";
                output.briza.product.product_description = job.variables.product;
                workersOutput[job.processInstanceKey]["briza"] = response.data;
                return job.complete(output)
            } catch (error) {
                console.error(error);
                return job.error("Failed in Briza Gateway");
            }
        }
    })
}

function processOutcome(res: any) {
    zbc.createWorker<ProcessPayload, {}, Partial<ProcessPayload>>({
        taskType: 'publish-outcome',
        taskHandler: async job => {
            try {
                console.log(job.workflowInstanceKey)
                const result = { ...job.variables } as Partial<ProcessPayload>;
                delete result.message_content
                setTimeout(() => {
                    zbc.close()
                }, 5000);
                return job.complete(result)
            } catch (error) {
                console.error(error);
                return job.error("Failed in Process Outcome");
            }
        }
    })
}