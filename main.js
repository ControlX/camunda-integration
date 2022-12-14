"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zeebe_node_1 = require("zeebe-node");
const dotenv_1 = require("dotenv");
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_json_1 = __importDefault(require("./swagger/openapi.json"));
(0, dotenv_1.config)();
let zbc;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_json_1.default));
let workersOutput = {};
app.delete('/quote/product', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        workersOutput = {};
        res.send({ "success": "All Products Deleted!" });
    });
});
app.get('/quote/product/:search', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            zbc = new zeebe_node_1.ZBClient();
            const deployFiles = ['./modeler/one-victor-quote-bpmn.bpmn'];
            yield zbc.deployProcess(deployFiles);
            const result = yield zbc.createProcessInstance('one-victor-search-orchestration', {
                message_content: 'Camunda started from NodeJS!!!'
            });
            workersOutput[result.processInstanceKey] = {};
            const product = req.params.search;
            yield processProduct(product);
            processVictorGateway();
            processBrizaGateway();
            processCarrierYGateway();
            processOutcome(res);
            res.send("Quotes generation under process with quote_request_id: " + result.processInstanceKey);
        }
        catch (err) {
            console.log(err);
        }
    });
});
app.get('/quote/:quote_id', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        res.send(workersOutput[req.params.quote_id]);
    });
});
app.get('/quote', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        res.send(workersOutput);
    });
});
app.listen(3000, '0.0.0.0', function () {
    console.log("Server running on port 3000");
});
function processProduct(product) {
    zbc.createWorker({
        taskType: 'select-product-input',
        taskHandler: job => {
            return job.complete({ product });
        }
    });
}
function processVictorGateway() {
    zbc.createWorker({
        taskType: 'victor_worker',
        taskHandler: (job) => __awaiter(this, void 0, void 0, function* () {
            let output = {};
            try {
                const response = yield axios_1.default.get('https://vz1z84zy6f.execute-api.us-west-2.amazonaws.com/quote/fd2cd0b6-aab7-4989-91cb-9a1b318ba6af');
                output.victor = {};
                output.victor = response.data;
                output.victor.product.product_type = job.variables.product;
                output.victor.product.description = (job.variables.product).toUpperCase() + " INSURANCE";
                output.victor.product.product_description = job.variables.product;
                workersOutput[job.processInstanceKey]["victor"] = response.data;
                return job.complete(output);
            }
            catch (error) {
                console.error(error);
                return job.error("Failed in Victor Gateway");
            }
        })
    });
}
function processCarrierYGateway() {
    zbc.createWorker({
        taskType: 'carrier_y_worker',
        taskHandler: (job) => __awaiter(this, void 0, void 0, function* () {
            let output = {};
            try {
                const response = yield axios_1.default.get('https://vz1z84zy6f.execute-api.us-west-2.amazonaws.com/quote/fd2cd0b6-aab7-4989-91cb-9a1b318ba6af');
                output.carrier_y = {};
                output.carrier_y = response.data;
                output.carrier_y.product.product_type = job.variables.product;
                output.carrier_y.product.description = (job.variables.product).toUpperCase() + " INSURANCE";
                output.carrier_y.product.product_description = job.variables.product;
                workersOutput[job.processInstanceKey]["carrier_y"] = response.data;
                return job.complete(output);
            }
            catch (error) {
                console.error(error);
                return job.error("Failed in Carrier Y Gateway");
            }
        })
    });
}
function processBrizaGateway() {
    zbc.createWorker({
        taskType: 'briza_worker',
        taskHandler: (job) => __awaiter(this, void 0, void 0, function* () {
            let output = {};
            try {
                const response = yield axios_1.default.get('https://vz1z84zy6f.execute-api.us-west-2.amazonaws.com/quote/fd2cd0b6-aab7-4989-91cb-9a1b318ba6af');
                output.briza = {};
                output.briza = response.data;
                output.briza.product.product_type = job.variables.product;
                output.briza.product.description = (job.variables.product).toUpperCase() + " INSURANCE";
                output.briza.product.product_description = job.variables.product;
                workersOutput[job.processInstanceKey]["briza"] = response.data;
                return job.complete(output);
            }
            catch (error) {
                console.error(error);
                return job.error("Failed in Briza Gateway");
            }
        })
    });
}
function processOutcome(res) {
    zbc.createWorker({
        taskType: 'publish-outcome',
        taskHandler: (job) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(job.workflowInstanceKey);
                const result = Object.assign({}, job.variables);
                delete result.message_content;
                setTimeout(() => {
                    zbc.close();
                }, 5000);
                return job.complete(result);
            }
            catch (error) {
                console.error(error);
                return job.error("Failed in Process Outcome");
            }
        })
    });
}
