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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var hardhat_1 = require("hardhat");
describe('ERC1155WebtoonHolder', function () {
    var erc721Contract;
    var erc1155Contract;
    var owner, artist, otherAccount;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var signers, ERC721Factory, ERC1155Factory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    signers = _a.sent();
                    owner = signers[0];
                    artist = signers[1];
                    return [4 /*yield*/, hardhat_1.ethers.getContractFactory('ERC721Webtoon')];
                case 2:
                    ERC721Factory = _a.sent();
                    return [4 /*yield*/, ERC721Factory.deploy(owner.address)];
                case 3:
                    erc721Contract = (_a.sent());
                    return [4 /*yield*/, erc721Contract.deployed()];
                case 4:
                    _a.sent();
                    console.log("ERC721Webtoon deployed to:", erc721Contract.address);
                    return [4 /*yield*/, hardhat_1.ethers.getContractFactory('ERC1155WebtoonHolder')];
                case 5:
                    ERC1155Factory = _a.sent();
                    return [4 /*yield*/, ERC1155Factory.deploy(erc721Contract.address, 'https://example.com/webtoon.json')];
                case 6:
                    erc1155Contract = (_a.sent());
                    return [4 /*yield*/, erc1155Contract.deployed()];
                case 7:
                    _a.sent();
                    console.log("ERC1155WebtoonHolder deployed to:", erc1155Contract.address);
                    // Mint some ERC721 tokens if needed for testing
                    return [4 /*yield*/, erc721Contract.approveArtist(artist.address)];
                case 8:
                    // Mint some ERC721 tokens if needed for testing
                    _a.sent();
                    return [4 /*yield*/, erc721Contract.connect(artist).mintWebtoon(artist.address, "some-uri")];
                case 9:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    describe('mintFromERC721', function () {
        it('Mints ERC1155 tokens and maps to ERC721 token IDs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var erc721TokenId, erc721TokenIds, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        erc721TokenId = 0;
                        erc721TokenIds = [erc721TokenId];
                        return [4 /*yield*/, erc1155Contract.mintFromERC721(erc721TokenIds)];
                    case 1:
                        _b.sent();
                        // Assertions
                        _a = chai_1.expect;
                        return [4 /*yield*/, erc1155Contract.balanceOf(owner.address, erc721TokenId)];
                    case 2:
                        // Assertions
                        _a.apply(void 0, [_b.sent()]).to.equal(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('Handles invalid ERC721 token IDs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidTokenId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidTokenId = 123;
                        return [4 /*yield*/, (0, chai_1.expect)(erc1155Contract.mintFromERC721([invalidTokenId]))
                                .to.be.revertedWith('ERC721NonexistentToken')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('Allows multiple mints from the same ERC721 token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var erc721TokenId, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        erc721TokenId = 0;
                        return [4 /*yield*/, erc1155Contract.mintFromERC721([erc721TokenId])];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, erc1155Contract.mintFromERC721([erc721TokenId])];
                    case 2:
                        _b.sent();
                        _a = chai_1.expect;
                        return [4 /*yield*/, erc1155Contract.balanceOf(owner.address, erc721TokenId)];
                    case 3:
                        _a.apply(void 0, [_b.sent()]).to.equal(2);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('balanceOf', function () {
        it('Returns zero for accounts with no tokens', function () { return __awaiter(void 0, void 0, void 0, function () {
            var signers, nonexistentTokenId, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                    case 1:
                        signers = _b.sent();
                        otherAccount = signers[3];
                        nonexistentTokenId = 555;
                        _a = chai_1.expect;
                        return [4 /*yield*/, erc1155Contract.balanceOf(otherAccount.address, nonexistentTokenId)];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).to.equal(0);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('uri', function () {
        it('Retrieves the correct URI from the ERC721 token', function () { return __awaiter(void 0, void 0, void 0, function () {
            var erc721TokenId, expectedURI, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        erc721TokenId = 0;
                        return [4 /*yield*/, erc721Contract.tokenURI(erc721TokenId)];
                    case 1:
                        expectedURI = _b.sent();
                        return [4 /*yield*/, erc1155Contract.mintFromERC721([erc721TokenId])];
                    case 2:
                        _b.sent();
                        _a = chai_1.expect;
                        return [4 /*yield*/, erc1155Contract.uri(erc721TokenId)];
                    case 3:
                        _a.apply(void 0, [_b.sent()]).to.equal(expectedURI);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
