(function(cor){

var
loader   = cor.loader = new cor.Loader(),
path     = cor.path;
isBooted = false;

function bootApp() {
    if (isBooted) {
        return;
    }
    
    isBooted = true;

    var
    entry, conf, sentry,
    scripts = document.getElementsByTagName('script'),
    len     = scripts.length,
    i       = -1;

    while (++i < len) {
        entry = entry || scripts[i].getAttribute('data-entry');
        conf   = conf   || scripts[i].getAttribute('data-conf');
    }

    if (entry && path.ext(entry) === '') {
        sentry = entry.split(path.pathSep);
        sentry.push(path.pathSep + sentry[sentry.length - 1] + '.cor');
        entry  = path.sanitize(sentry.join(path.pathSep));
    }

    loader.setEntry(entry, conf);

}

if (cor.isBrowser) {
    if (document.readyState === 'complete') {
        bootApp();
    }
    else {
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', bootApp, false);
            window.addEventListener('load', bootApp, false);
        }
        else {
            document.attachEvent('onreadystatechange', bootApp);
            window.attachEvent('onload', bootApp);
        }
    }    
}

})(typeof cor === 'undefined' ? {} : cor);
