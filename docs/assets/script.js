(function() {

function supportGenerators() {
    try {
        eval('(function*(){})')
        return true;
    } catch (e) {
        return false;
    }
}


function init() {
    var div, body = document.body;

    if (!supportGenerators()) {
        div = document.createElement('div');
        div.setAttribute('class', 'notification');
        div.onclick = function() { body.removeChild(div) }
        div.innerHTML =
        'Ooops!!! Live code including tests and some examples will not run properly because your browser is outdated. See \
        <a href="http://yosbelms.github.io/cor/docs/documentation.html#platformcompatibility">why</a> &nbsp;';

        body.appendChild(div)
    }
}

if (document.readyState === 'complete') {
    init()
} else {
    document.addEventListener('DOMContentLoaded', init, false);
}

})()