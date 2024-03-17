'use strict';

const {Contract, Context} = require("fabric-contract-api");

class UserList {
    constructor(ctx) {
        this.ctx = ctx;
        this.KEY = "users";
    }
    async createUsers(users) {
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async getUsers() {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        return users;
    }
    async getUser(login) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        return users[login];
    }
    async addUser(login, user) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login] = user;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async addAdmin(login) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].role = 3;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async addPostman(login, postIndex) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].role = 2;
        users[login].postIndex = postIndex;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async delPostman(login) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].role = 1;
        users[login].postIndex = "";
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async changeName(login, newName) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].name = newName;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async changeAddress(login, newAddress) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].address = newAddress;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async changePostIndex(login, newPostIndex) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].postIndex = newPostIndex;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async againstAcceptPackage(login) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].acceptPackage = !users[login].acceptPackage;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async sendMoney(login, money) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].balance -= money;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async getMoney(login, money) {
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        users[login].balance += money;
        const DataUsers = Buffer.from(JSON.stringify(users));
        await this.ctx.stub.putState(this.KEY, DataUsers);
    }
    async getUserOfPostIndex(indexPost) { //найти сотрудника почты по индексу отделения
        const ListUsers = await this.ctx.stub.getState(this.KEY);
        const users = JSON.parse(ListUsers.toString());
        const usersValue = Object.values(users);
        const user = usersValue.find(user => user.postIndex === indexPost);
        return user.login;
    }
}

class UsersCTX extends Context {
    constructor() {
        super();
        this.userList = new UserList(this);
    }
}

class User {
    constructor(id, login, name, address, role) {
        this.id = id;
        this.login = login;
        this.name = name;
        this.address = address;
        this.role = role; //1-пользователь, 2 - сотрудник почты, 3 - админ, 4 - главный админ
        this.balance = 100;
        this.postIndex = "";
        this.acceptPackage = true;
    }
}

class UsersContract extends Contract {
    createContext() {
        return new UsersCTX();
    }
    async initializationContract(ctx) {
        const users = {};
        users["superAdmin"] = new User(0, "superAdmin", "Super Admin", "Kaluga", 4);
        await ctx.userList.createUsers(users);
        return users;
    }
    async registration(ctx, login, name, address) {
        const users = await ctx.userList.getUsers();
        if(users[login]) {
            return new Error();
        }
        const user = new User(Object.keys(users), login ,name, address, 1);
        await ctx.userList.addUser(login, user);
        return user;
    }
    async addAdmin(ctx, loginAdmin, loginUser) {
        const users = await ctx.userList.getUsers();
        if(users[loginAdmin].role !== 4) {
            return new Error();
        }
        await ctx.userList.addAdmin(loginUser);
        return await ctx.userList.getUser(loginUser);
    }
    async addPostman(ctx, loginAdmin, loginUser, postIndex) {
        const users = await ctx.userList.getUsers();
        if(users[loginAdmin].role !== 3) {
            return new Error();
        }
        if(users[loginUser].role > 1) {
            return new Error();
        }
        await ctx.userList.addPostman(loginUser, postIndex);
        return await ctx.userList.getUser(loginUser);
    }
    async changeName(ctx, login, newName) {
        await ctx.userList.changeName(login,newName);
        return await ctx.userList.getUser(login);
    }
    async changeAddress(ctx, login, newAddress) {
        await ctx.userList.changeAddress(login,newAddress);
        return await ctx.userList.getUser(login);
    }
    async delPostman(ctx, loginAdmin, loginUser) {
        const users = await ctx.userList.getUsers();
        if(users[loginAdmin].role !== 3) {
            return new Error();
        }
        if(users[loginUser].role !== 2) {
            return new Error();
        }
        await ctx.userList.delPostman(loginUser);
        return await ctx.userList.getUser(loginUser);
    }
    async changePostIndex(ctx, loginAdmin, loginUser, newPostIndex) {
        if(users[loginAdmin].role !== 3) {
            return new Error();
        }
        if(users[loginUser].role !== 2) {
            return new Error();
        }
        await ctx.userList.changePostIndex(loginUser, newPostIndex);
        return await ctx.userList.getUser(loginUser);
    }
    async againstAcceptPackage(ctx, login) {
        await ctx.userList.againstAcceptPackage(login);
        return await ctx.userList.getUser(login);
    }
    async getUserOfPostIndex(ctx, postIndex) {
        return await ctx.userList.getUserOfPostIndex(postIndex);
    }
}

module.exports.UserList = UserList;
module.exports.UsersContract = UsersContract;