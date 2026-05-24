"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = exports.UserDefinedDiceTable = exports.DynamicLoader = exports.Base = void 0;
var base_1 = require("./base");
Object.defineProperty(exports, "Base", { enumerable: true, get: function () { return __importDefault(base_1).default; } });
var dynamic_loader_1 = require("./loader/dynamic_loader");
Object.defineProperty(exports, "DynamicLoader", { enumerable: true, get: function () { return __importDefault(dynamic_loader_1).default; } });
var user_defined_dice_table_1 = require("./user_defined_dice_table");
Object.defineProperty(exports, "UserDefinedDiceTable", { enumerable: true, get: function () { return __importDefault(user_defined_dice_table_1).default; } });
var version_1 = require("./version");
Object.defineProperty(exports, "Version", { enumerable: true, get: function () { return __importDefault(version_1).default; } });
//# sourceMappingURL=index.js.map