"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var password_service_js_1 = require("./src/infrastructure/auth/password.service.js");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var hash = await (0, password_service_js_1.hashPassword)('senha123');
await prisma.provider.updateMany({ data: { password: hash } });
await prisma.$disconnect();
console.log('Done — all providers password: senha123');
