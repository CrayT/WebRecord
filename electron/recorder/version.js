
const versionList = ['chrome', 'node', 'electron'];
let str = [];
for (const dependency of versionList) {
    str.push(`${dependency}-version: ${electronAPI[dependency]()}`);
}
const element = document.getElementById('version');
if (element) element.innerText = str.join(', ');

electronAPI.onUpdateCounter((value) => {
    console.log(value);
});

const response = await electronAPI.checkAccess()
console.log('---check screen access----', response);
if(response !== 'granted') {
    console.log('录屏权限未开启，需要手动开启');
}