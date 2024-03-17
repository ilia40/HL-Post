"use strict";

const {Contract, Context} = require("fabric-contract-api");
const { UserList } = require("./Users");

class TransferList {
    constructor(ctx) {
        this.ctx = ctx;
        this.KEY = KEY;
    }
    async createTransfers(transfers) {
        const DataTransfers = Buffer.from(JSON.stringify(transfers));
        await this.ctx.stub.putState(this.KEY, DataTransfers); 
    }
    async addTransfer(transfer) {
        const ListTransfers = await this.ctx.stub.getState(this.KEY);
        const transfers = JSON.parse(ListTransfers.toString());
        transfers.push(transfer);
        const DataTransfers = Buffer.from(JSON.stringify(transfers));
        await this.ctx.stub.putState(this.KEY, DataTransfers); 
    }
    async getTransfers() {
        const ListTransfers = await this.ctx.stub.getState(this.KEY);
        const transfers = JSON.parse(ListTransfers.toString());
        return transfers;
    }
    async getTransfer(id) {
        const ListTransfers = await this.ctx.stub.getState(this.KEY);
        const transfers = JSON.parse(ListTransfers.toString());
        return transfers[id];
    }
    async changeStatusTransfer(id, nameStatus) {
        const ListTransfers = await this.ctx.stub.getState(this.KEY);
        const transfers = JSON.parse(ListTransfers.toString());
        transfers[id].status = nameStatus;
        const DataTransfers = Buffer.from(JSON.stringify(transfers));
        await this.ctx.stub.putState(this.KEY, DataTransfers); 
    }
}

class Transfer {
    constructor(id, loginSender, loginRecipient, money, timeSend, liveTime) {
        this.id = id;
        this.loginSender = loginSender;
        this.loginRecipient  = loginRecipient;
        this.money = money;
        this.timeSend = timeSend;
        this.liveTime = liveTime;
        this.status = "Send"; //Send, Accepted, Canceled
    }
}

class TransfersCTX extends Context {
    constructor() {
        super();
        this.transferList = new TransferList(this);
        this.userList = new UserList(this);
    }
}

class TransfersContract extends Contract {
    createContext() {
        return new TransfersCTX();
    }
    async initializationContract(ctx) {
        const transfers = [];
        await ctx.transferList.createTransfers(transfers);
        return transfers;
    }
    async addTransfer(ctx, loginSender, loginRecipient, money, liveTime) {
        const transfers = await ctx.transferList.getTransfers();
        const transfer = new Transfer(Object.keys(transfers), loginSender, loginRecipient, money, new Date(), liveTime);
        await ctx.transferList.addTransfer(transfer);
        await ctx.userList.sendMoney(loginSender, money);
        return transfer;
    }
    async checkLiveTime(ctx, id) { //время жизни перевода
        const transfers = await ctx.transferList.getTransfers();
        if(transfers[id].status === "Send") {
            await ctx.transferList.changeStatusTransfer(id, "Canceled");
            await ctx.userList.getMoney(transfers[id].loginSender, transfers[id].money);
            return transfers[id];
        }        
    }
    async acceptTransfer(ctx, id, login) {
        const transfers = await ctx.transferList.getTransfers();
        if(transfers[id].status === "Send") {
            return new Error();
        }
        if (transfers[id].loginRecipient !== login) {
            return new Error();
        }
        await ctx.transferList.changeStatusTransfer(id, "Accepted");
        await ctx.userList.getMoney(transfers[id].loginRecipient, transfers[id].money);
        return transfers[id];
    }
    async cancelTransfer(ctx, id, login) {
        const transfers = await ctx.transferList.getTransfers();
        if(transfers[id].status === "Send") {
            return new Error();
        }
        if (transfers[id].loginRecipient !== login && transfers[id].loginSender !== login) {
            return new Error();
        }
        await ctx.transferList.changeStatusTransfer(id, "Canceled");
        await ctx.userList.getMoney(transfers[id].loginSender, transfers[id].money);
        return transfers[id];
    }
}

module.exports.TransfersContract = TransfersContract;