
const DB_NAME = 'webrecord';
const TABLE_NAME = 'chunks';

const myDB = indexedDB.open(DB_NAME, 1);
let mydb;
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

export function clearDB() {

}

export function getAllBlobs() {
    if(mydb) {
        const req = mydb.transaction(TABLE_NAME, 'readwrite').objectStore(TABLE_NAME).openCursor();
        req.onsuccess = function(event) {
            console.log('get cursor blob success');
            const cursor = event.target.result;

            if (cursor) {
                console.log('cursor: ', cursor.value);
                cursor.continue();
            } else {
                console.log('没有更多数据了！');
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

export default mydb;