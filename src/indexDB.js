
const DB_NAME = 'webrecord';
const TABLE_NAME = 'chunks';

const DBState = {
    Null: 0,
    Opening: 1,
    Ready: 2,
    Error: 3,
}
class MyDB {
    constructor() {
        this.mydb = null;
        this.state = DBState.Null;
        const db = indexedDB.open(DB_NAME, 1);
        this.state = DBState.Opening;
        db.onsuccess = this.onsuccess.bind(this);
        db.onupgradeneeded = this.onupgradeneeded.bind(this);
        db.onerror = this.onerror.bind(this);
        this.callback = [];
    }

    onsuccess(event) {
        console.log('indexdb success')
        console.log(event.target.result)
        const mydb = event.target.result;
        this.mydb = mydb;
        this.state = DBState.Ready;
        this.dispatch({type: 'success'});
    }

    addListener(callback) {
        this.callback.push(callback);
    }

    dispatch(data) {
        if(data.type === 'success') {
            this.callback.forEach(cb => {
                cb();
            });
        }
    }

    onerror() {
        console.log('open indexdb error');
        this.state = DBState.Error;
    }

    onupgradeneeded(event) {
        // 第一次创建db、store
        console.log('indexdb onupgradeneeded')
        const mydb = event.target.result;
        // 创建table，指定key键值
        this.mydb = mydb;
        this.state = DBState.Ready;
        this.dispatch({type: 'success'});
    }

    async waitReady() {
        return new Promise((resolve, reject) => {
            const callback = function() {
                console.log('callback')
                resolve();
            }
            this.addListener(callback);
        });
    }

    async addBlob(item) {
        const add = async () => {
            return new Promise((resolve, reject) => {
                const req = this.mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).add(item);
                req.onsuccess = function() {
                    console.log('add blob success');
                    resolve();
                }
                req.onerror = function(e) {
                    console.log('add blob error', e);
                    reject('add blob error');
                }                
            });
        }
        if(this.state === DBState.Opening) {
            console.log('db is opening')
            await this.waitReady();
            return add();
        } else if(this.state === DBState.Ready) {
            return add();
        }
    }

    async clearAll() {
        const clear = async () => {
            return new Promise((resolve, reject) => {
                const req = this.mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).clear();
                req.onsuccess = function(event) {
                    if(!event.target.result) {
                        console.log('clear all records success')
                        resolve();
                    } else {
                        reject('clear all error: operate fail');
                    }
                }
                req.onerror = function(e) {
                    reject('clear all error: error');
                }
            })
        }
        if(this.state === DBState.Opening) {
            console.log('db is opening')
            await this.waitReady();
            return clear();
        } else if(this.state === DBState.Ready) {
            return clear();
        }
    }

    async deleteObjectsById(ids) {
        const delObj = async (id) => {
            return new Promise((resolve, reject) => {
                const req = this.mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).delete(id);
                req.onsuccess = function() {
                    console.log(`delete ${id} success`)
                    resolve();
                }
                req.onerror = function() {
                    reject('delete error');
                }
            })
        }
        if(this.state === DBState.Opening) {
            console.log('db is opening')
            await this.waitReady();
            for(let id of ids) {
                await delObj(id);
            }
        } else if(this.state === DBState.Ready) {
            for(let id of ids) {
                await delObj(id);
            }
        }
    }

    async getAllBlobs(filter) {
        const getAll = async () => {
            return new Promise((resolve, reject) => {
                const allData = [];
                const req = this.mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).openCursor();
                req.onsuccess = function(event) {
                    console.log('openCursor success:', event.target.result)
                    const cursor = event.target.result;
                    if (cursor) {
                        if(filter) {
                            if(filter(cursor.value)) {
                                allData.push(cursor.value);
                            }
                        } else {
                            allData.push(cursor.value);
                        }
                        cursor.continue();
                    } else {
                        // 重新按照存储顺序排序
                        allData.sort((a, b) => a.chunk_id - b.chunk_id);
                        console.log(`已获取的所有`, allData);
                        resolve(allData);
                    }
                }
                req.onerror = function(e) {
                    console.log('add blob error', e);
                    reject(e);
                }
            });
        }
        if(this.state === DBState.Opening) {
            console.log('db is opening')
            await this.waitReady();
            return getAll();
        } else if(this.state === DBState.Ready) {
            return getAll();
        }
    }
}

export const myDB = new MyDB();
window.myDB = myDB;