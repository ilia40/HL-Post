    "use strict";

    const {Contract, Context} = require("fabric-contract-api");
    const { UserList } = require("./Users");

    class PackageList {
        constructor(ctx) {
            this.ctx = ctx;
            this.KEY = "packages";
        }
        async createPackages(packages) {
            const DataPackages = Buffer.from(JSON.stringify(packages));
            await this.ctx.stub.putState(this.KEY, DataPackages);
        }
        async addPackage(onePackage) {
            const ListPackages = await this.ctx.stub.getState(this.KEY);
            const packages = JSON.parse(ListPackages.toString());
            packages.push(onePackage);
            const DataPackages = Buffer.from(JSON.stringify(packages));
            await this.ctx.stub.putState(this.KEY, DataPackages); 
        }
        async getPackages() {
            const ListPackages = await this.ctx.stub.getState(this.KEY);
            const packages = JSON.parse(ListPackages.toString());
            return packages;
        }
        async getPackage(id) {
            const ListPackages = await this.ctx.stub.getState(this.KEY);
            const packages = JSON.parse(ListPackages.toString());
            return packages[id];
        }
        async changeStatusPackage(id, nameStatus) {
            const ListPackages = await this.ctx.stub.getState(this.KEY);
            const packages = JSON.parse(ListPackages.toString());
            packages[id].status = nameStatus;
            const DataPackages = Buffer.from(JSON.stringify(packages));
            await this.ctx.stub.putState(this.KEY, DataPackages); 
        }
        async acceptOnPost(id) {
            const ListPackages = await this.ctx.stub.getState(this.KEY);
            const packages = JSON.parse(ListPackages.toString());
            packages[id].timeOfheEndPost = new Date();
            const DataPackages = Buffer.from(JSON.stringify(packages));
            await this.ctx.stub.putState(this.KEY, DataPackages); 
        }
        async nextSendPackage(id, thisIndexSend, indexNextSend) {
            const ListPackages = await this.ctx.stub.getState(this.KEY);
            const packages = JSON.parse(ListPackages.toString());
            packages[id].thisIndexSend = thisIndexSend;
            packages[id].indexNextSend = indexNextSend;
            const DataPackages = Buffer.from(JSON.stringify(packages));
            await this.ctx.stub.putState(this.KEY, DataPackages); 
        }
    }

    class Package {
        constructor(id, timeSend, trackNumber, loginSender, loginRecipient, typePackage, classPackage, deliveryTime, deliveryPrice, weight, value, allPrice, indexPostSender, senderAddress, indexSend, indexNextSend, indexPostRecipient, recipientAddress) {
            this.id = id;
            this.timeSend = timeSend;
            this.trackNumber = trackNumber;
            this.loginSender = loginSender;
            this.loginRecipient  = loginRecipient;
            this.typePackage = typePackage;
            this.classPackage = classPackage;
            this.deliveryTime = deliveryTime;
            this.deliveryPrice = deliveryPrice;
            this.weight = weight;
            this.value = value;
            this.allPrice = allPrice;
            this.indexPostSender = indexPostSender;
            this.senderAddress = senderAddress;
            this.indexSend = indexSend;
            this.indexNextSend = indexNextSend;
            this.indexPostRecipient = indexPostRecipient;
            this.recipientAddress = recipientAddress;
            this.timeOfheEndPost = "";
            this.status = "Delivering"; //Delivering, Accepted, Canceled, Ready to recieve
        }
    }

    class PackagesCTX extends Context {
        constructor() {
            super();
            this.packageList = new PackageList(this);
            this.userList = new UserList(this);
        }
    }
    class PackagesContract extends Contract {
        createContext() {
            return new PackagesCTX();
        }
        async initializationContract(ctx) {
            const packages = [];
            await ctx.transferList.createTransfers(packages);
            return packages;
        }
        async addPackage(ctx, loginPostman, trackNumber, loginSender, loginRecipient, typePackage, classPackage, weight, value, indexPostRecipient, indexNextSend) {
            const users = await ctx.userList.getUsers();
            if(users[loginRecipient].acceptPackage === false) {
                return new Error();
            }
            const packages = await ctx.packageList.getPackages();
            let deliveryTime;
            let deliveryPrice;
            let allPrice;
            if(classPackage === 1) {
                deliveryTime = 10;
                deliveryPrice = weight/2;
            }
            if(classPackage === 2) {
                deliveryTime = 15;
                deliveryPrice = weight*3/10;
            }
            if(classPackage === 3) {
                deliveryTime = 20;
                deliveryPrice = weight/10;
            }
            allPrice = deliveryPrice*weight+value*2/10;
            if(users[loginSender].balance < allPrice) {
                return new Error();
            }
            const onePackage = new Package(Object.keys(packages), new Date(), trackNumber, loginSender, loginRecipient, typePackage, classPackage, deliveryTime, deliveryPrice, weight, value, allPrice, users[loginPostman].postIndex, users[loginSender].address, users[loginPostman].postIndex, indexNextSend, indexPostRecipient, users[loginRecipient].address);
            await ctx.packageList.addPackage(onePackage);
            await ctx.userList.sendMoney(loginSender, allPrice);
            return onePackage;
        }
        async acceptPackageInFinnalyPost(ctx, login, id) { //принятие посылки на конечном пункте
            const packages = await ctx.packageList.getPackages();
            const users = await ctx.userList.getUsers();
            if(users[login].postIndex !== packages[id].indexPostRecipient) {
                return new Error();
            }
            if (packages[id].status === "Delivering") {
                await ctx.packageList.changeStatusPackage(id, "Ready to recieve");
                await ctx.packageList.acceptOnPost(id);
                return packages[id];
            }
        }
        async acceptOnBetweenPost(ctx, login, id, indexNextSend) { //посылку принимают промежуточных точках
            const users = await ctx.userList.getUsers();
            const packages = await ctx.packageList.getPackages();
            if(packages[id].status === "Ready to recieve") {
                return new Error();
            }
            if(users[login].postIndex === packages[id].indexPostRecipient) {
                return new Error();
            }
            await ctx.packageList.nextSendPackage(id, indexNextSend);
            return packages[id];
        }
        async forRecieveMoneyOfDelivery(ctx, id) { //возврат денег если 
            const packages = await ctx.packageList.getPackages();
            if (packages[id].status !== "Accepted") {
                if (packages[id].classPackage === 1) {
                    await ctx.userList.getMoney(packages[id].loginSender, packages[id].deliveryPrice);
                }
                if (packages[id].classPackage === 2) {
                    await ctx.userList.getMoney(packages[id].loginSender, packages[id].deliveryPrice/2+packages[id].value);
                }
                if (packages[id].classPackage === 3) {
                    await ctx.userList.getMoney(packages[id].loginSender, packages[id].value);
                }
            }
        }
        async cancelPackageOfTime(ctx, id) { //прошло 14 дней со дня поступления на конечный пункт; Отменил посылку
            const packages = await ctx.packageList.getPackages();
            if (packages[id].status !== "Accepted") {
                await ctx.packageList.changeStatusPackage(id, "Canceled");
                return packages[id];
            }
        }

        async acceptPost(ctx, login, id) {
            const packages = await ctx.packageList.getPackages();
            if(packages[id].recipientAddress !== login) {
                return new Error();
            }
            if (packages[id].status === "Accepted") {
                return new Error();
            }
            await ctx.packageList.changeStatusPackage(id, "Accepted");
            return packages[id];
        }
    }

    module.exports.PackagesContract = PackagesContract;