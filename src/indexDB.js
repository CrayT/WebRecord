
const DB_NAME = 'webrecord';
const TABLE_NAME = 'chunks';

const myDB = indexedDB.open(DB_NAME, 1);
export let mydb;
let store;

myDB.onsuccess = function(event) {
    // 后续可以直接拿到db
    console.log('indexdb success')
    console.log(event.target.result)
    mydb = event.target.result;
    window.mydb = mydb;
}

myDB.onerror = function(e) {
    console.log('indexdb error', e)
}

myDB.onupgradeneeded = function(event) {
    // 第一次创建db、store
    console.log('indexdb onupgradeneeded')
    mydb = event.target.result;
    // 创建table，指定key键值
    store = mydb.createObjectStore(TABLE_NAME, {keyPath: 'chunk_id'});
    console.log('store: ', store)
    window.mystore = store;
}

export function addBlob(item) {
    if(mydb) {
        const req = mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).add(item);
        req.onsuccess = function() {
            console.log('add blob success');
        }
        req.onerror = function(e) {
            console.log('add blob error', e);
        }
    } else {
        console.warn('not found mydb');
    }
}

export function getAllBlobs() {
    return new Promise((resolve, reject) => {
        if(mydb) {
            const allData = [];
            const req = mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).openCursor();
            req.onsuccess = function(event) {
                console.log('openCursor success:', event.target.result)
                const cursor = event.target.result;
                if (cursor) {
                    allData.push(cursor.value);
                    cursor.continue();
                  } else {
                    // 重新按照存储顺序排序
                    allData.sort((a, b) => a.chunk_id - b.chunk_id);
                    console.log(`已获取的所有客户`, allData);
                    resolve(allData.map(d => d.data));
                  }
            }
            req.onerror = function(e) {
                console.log('add blob error', e);
                reject(e);
            }
        } else {
            console.warn('not found mydb');
            reject('notFound db');
        }
    });
}

export function clearAll() {
    if(mydb) {
        const req = mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).getAll();
        req.onsuccess = function(event) {
            console.log('getall success:', event.target.result)
            if(event.target.result) {
                event.target.result.forEach(data => {
                    const deleteReq = mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).delete(data.chunk_id);
                    deleteReq.onsuccess = function() {
                        console.log('delete success: ', data.chunk_id);
                    }
                    deleteReq.onerror = function() {
                        console.log('delete error: ', data.chunk_id);
                    }
                });
            }
        }
        req.onerror = function(e) {
            console.log('add blob error', e);
        }
    } else {
        console.warn('not found mydb');
    }
}

window.addBlob = addBlob;
window.getAllBlobs = getAllBlobs;
window.clearAll = clearAll;