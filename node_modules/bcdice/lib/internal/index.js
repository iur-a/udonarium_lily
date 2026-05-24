"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Opal = exports.I18n = exports.BCDice = void 0;
require("../../lib/bcdice/version");
var opal_1 = __importDefault(require("./opal"));
exports.BCDice = opal_1.default.module(null, 'BCDice');
exports.I18n = opal_1.default.module(null, 'I18n');
var opal_2 = require("./opal");
Object.defineProperty(exports, "Opal", { enumerable: true, get: function () { return __importDefault(opal_2).default; } });
//# sourceMappingURL=index.js.map