"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const events_service_1 = require("../events/events.service");
const swagger_1 = require("@nestjs/swagger");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    dashboardService;
    eventsService;
    constructor(dashboardService, eventsService) {
        this.dashboardService = dashboardService;
        this.eventsService = eventsService;
    }
    getResumo() {
        return this.dashboardService.getResumo();
    }
    stream() {
        return this.eventsService.getDashboardUpdates().pipe((0, rxjs_1.map)(() => ({ data: { type: 'update' } })));
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('resumo'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter resumo para o dashboard' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "getResumo", null);
__decorate([
    (0, common_1.Sse)('stream'),
    (0, swagger_1.ApiOperation)({ summary: 'Stream SSE de atualizações do dashboard' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], DashboardController.prototype, "stream", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService,
        events_service_1.EventsService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map