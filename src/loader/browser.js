(function(){ typeof cor === 'undefined' && (cor = {});

var
loader = cor.loader = new cor.Loader(),
path   = cor.path;

function bootApp() {
    var
    entry, env, sentry,
    scripts = document.getElementsByTagName('script'),
    len     = scripts.length,
    i       = -1;

    while (++i < len) {
        entry = scripts[i].getAttribute('data-entry');
        env   = scripts[i].getAttribute('data-env');
    }

    if (entry && path.ext(entry) === '') {
        sentry = entry.split(path.pathSep);
        sentry.push(path.pathSep + sentry[sentry.length - 1] + '.cor');
        entry  = path.sanitize(sentry.join(path.pathSep));
    }

    loader.setEntry(entry, env);
}

if (cor.isBrowser) {
    document.addEventListener
        ? document.addEventListener('DOMContentLoaded', bootApp, false)
        : document.attachEvent('onreadystatechange', bootApp);
}

}).call(this);
