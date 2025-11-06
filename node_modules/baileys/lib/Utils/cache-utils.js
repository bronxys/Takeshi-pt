"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cache_1 = __importDefault(require("@cacheable/node-cache"));
const caches = {
    lidCache: new node_cache_1.default({ stdTTL: 3600, checkperiod: 3600 })
};
exports.default = caches;
