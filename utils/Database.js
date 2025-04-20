const { set, get, unset } = require("lodash");
const fs = require('fs');

class Database {
    #type = "JSON";
    #filePath = process.cwd() + '/databases/default.json';
    #datas = {};
    constructor({ file }) {
        if(file) {
            if(fs.existsSync(process.cwd() + file)) {
                this.#filePath = process.cwd() + file;
                this.#datas = JSON.parse(fs.readFileSync(process.cwd() + file));
            } else {
                this.#filePath = process.cwd() + file;
                fs.appendFileSync(this.#filePath, '{}');
                this.#datas = JSON.parse(fs.readFileSync(this.#filePath));
            }
        } else {
            if(fs.existsSync(this.#filePath)) {
                this.#datas = JSON.parse(fs.readFileSync(this.#filePath));
            } else {
                this.#filePath = process.cwd() + '/databases/default.json';
                fs.appendFileSync(this.#filePath, '{}');
                this.#datas = JSON.parse(fs.readFileSync(this.#filePath));
            }
        }
    }
    get name() {
        return this.#filePath.split('/')[this.#filePath.split('/').length - 1].split('.')[0]
    }
    get type() {
        return this.#type;
    }
    set type(type) {
        if(!["json"].includes(type.toLowerCase())) throw 'Type of database must be \'json\'';
        this.#type = type.toUpperCase();
        return true;
    }
    get(key) {
        if(!key) throw new Error('You must type key to fetch');
        if(key.includes(".")) {
            const [objKey, ...keys] = key.split('.');
            const object = this.#datas[objKey];
            return get(object, keys.join('.'));
        } else {
            return this.#datas[key];
        }
    }
    fetch(key) {
        return this.get(key);
    }
    getAll() {
        return this.#datas;
    }
    has(key) {
        if(!key) throw new Error('You must type key to fetch');
        const data = this.get(key);
        if(data) return true;
        else return false;
    }
    set(key, value) {
        if(!key) throw new Error('You must type key to set');
        if(!value) throw new Error('You must type value to set');
        if(key.includes(".")) {
            const [objKey, ...keys] = key.split('.');
            var object = this.get(objKey);
            if(object instanceof Object == false) {
                object = {};
            }
            set(object, keys.join('.'), value);
            this.#datas[objKey] = object;
        } else {
            this.#datas[key] = value; 
        }
        this.saveFile();
        return this.get(key);
    }
    delete(key) {
        if(!key) throw new Error('You must type key to delete');
        if(key.includes(".")) {
            const [objKey, ...keys] = key.split('.');
            var object = this.get(objKey);
            if(object instanceof Object == false) {
                object = {};
            }
            unset(object, keys.join('.'));
            this.#datas[objKey] = object;
        } else {
            delete this.#datas[key] 
        }
        this.saveFile();
        return true;
    }
    add(key, value) {
        var object = this.get(key);
        if(!key) throw new Error('You must type key to add');
        if(!value) throw new Error('You must type value to add');
        if(isNaN(value)) throw new Error('Value must be number');
        if(!object) {
            object = 0;
        }
        if(Array.isArray(object)) throw new Error('You can\'t add anything to array, use push instead for adding something.');
        else if(object instanceof Object) throw new Error('You can\'t add anything to object.');
        else if(isNaN(object)) throw new Error('You can\'t add anything to string.');
        
        var number = parseInt(object);
        number += value;
        this.set(key, number.toString())
    }
    subtract(key, value) {
        var object = this.get(key);
        if(!key) throw new Error('You must type key to subtract');
        if(!value) throw new Error('You must type value to subtract');
        if(isNaN(value)) throw new Error('Value must be number');
        if(!object) {
            object = 0;
        }
        if(Array.isArray(object)) throw new Error('You can\'t subtract anything to array, use pull instead for subtracting something.');
        else if(object instanceof Object) throw new Error('You can\'t subtract anything to object.');
        else if(isNaN(object)) throw new Error('You can\'t subtract anything to string.');
        
        var number = parseInt(object);
        number -= value;
        this.set(key, number.toString())
    }
    push(key, value) {
        var object = this.get(key);
        if(!key) throw new Error('You must type key to push');
        if(!value) throw new Error('You must type value to push');
        if(Array.isArray(object)) {
            object.push(value);
            return this.set(key, object);
        } else if(object instanceof Object) throw new Error('You can\'t push anything to object.');
        else throw new Error('You can\'t push anything to string.');
    }
    pull(key, value) {
        var object = this.get(key);
        if(!key) throw new Error('You must type key to pull');
        if(!value) throw new Error('You must type value to pull');
        if(Array.isArray(object)) {
            if(Array.isArray(value)) {
                object = object.filter((v) => { 
                    if(Array.isArray(v)) {
                        const filter = (v) => value.filter(val => JSON.stringify(v).toLocaleLowerCase() == JSON.stringify(val).toLocaleLowerCase())
                        return JSON.stringify(filter(v)).toLocaleLowerCase() !== JSON.stringify(value).toLocaleLowerCase()
                    } else {
                        return !value.includes(v)
                    }
                });
            } else if(object instanceof Object) {
                object = object.filter((object) => JSON.stringify(object).toLocaleLowerCase() !== JSON.stringify(value).toLocaleLowerCase());
            } else {
                object = object.filter((v) => v !== value);
            }
            return this.set(key, object);
        } else if(object instanceof Object) throw new Error('You can\'t pull anything from object.');
        else throw new Error('You can\'t pull anything from string.');
    }
    find(find) {
        var object = this.getAll();
        if(!find instanceof Function) throw new Error('Find section must be function.')
        if(Array.isArray(object)) {
            object = object.filter(filter);
            return object;
        } else if(object instanceof Object) {
            object = Object.entries(object).map(([key, value]) => { return { key: key, value: value }}).find(find);
            return object;
        } else throw new Error('You can\'t find anything from string.');
    }
    filter(filter) {
        var object = this.getAll();
        if(!filter instanceof Function) throw new Error('Filter section must be function.')
        if(Array.isArray(object)) {
            object = object.filter(filter);
            return object;
        } else if(object instanceof Object) {
            object = Object.entries(object).map(([key, value]) => { return { key: key, value: value }}).filter(filter);
            return object;
        } else throw new Error('You can\'t filter anything from string.');
    }
    map(map) {
        var object = this.getAll();
        if(!map instanceof Function) throw new Error('Map section must be function.')
        if(Array.isArray(object)) {
            object = object.map(map);
            return object;
        } else if(object instanceof Object) {
            object = Object.entries(object).map(([key, value]) => { return { key: key, value: value }}).map(map);
            return object;
        } else throw new Error('You can\'t map string.');
    }
    saveFile() {
        fs.writeFileSync(this.#filePath, JSON.stringify(this.#datas));
    }
}

module.exports = Database;