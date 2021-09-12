// pnp:/Users/mariuswilms/Code/dsk/js-sdk/src/Client.js
var cancelSearch = null;
var cancelFilter = null;
var Client = class {
  static hello() {
    return this.fetch("/api/v2/hello");
  }
  static config() {
    return this.fetch("/api/v2/config");
  }
  static sources() {
    return this.fetch("/api/v2/sources");
  }
  static messages() {
    let protocol = window.location.protocol === "https:" ? "wss" : "ws";
    let host = window.location.hostname;
    let port = window.location.port ? `:${window.location.port}` : "";
    return new WebSocket(`${protocol}://${host}${port}/api/v2/messages`);
  }
  static tree(version = null) {
    let params = new URLSearchParams();
    if (version) {
      params.set("v", version);
    }
    return this.fetch(`/api/v2/tree?${params.toString()}`);
  }
  static has(url, version = null) {
    let params = new URLSearchParams();
    if (version) {
      params.set("v", version);
    }
    return this.ping(`/api/v2/tree/${this.url(url)}?${params.toString()}`);
  }
  static get(url, version = null) {
    let params = new URLSearchParams();
    if (version) {
      params.set("v", version);
    }
    return this.fetch(`/api/v2/tree/${this.url(url)}?${params.toString()}`);
  }
  static playgroundURL(node, doc, component, version = null) {
    let params = new URLSearchParams();
    if (version) {
      params.set("v", version);
    }
    return Promise.resolve(`/api/v2/tree/${this.url(node)}/_docs/${doc}/_playgrounds/${component}/index.html?${params.toString()}`);
  }
  static url(url) {
    if (url?.charAt(0) === "/") {
      url = url.substring(1);
    }
    if (url?.charAt(url.length - 1) === "/") {
      url = url.slice(0, -1);
    }
    return url;
  }
  static search(q, version = null) {
    let params = new URLSearchParams();
    params.set("q", q);
    if (version) {
      params.set("v", version);
    }
    if (cancelSearch) {
      cancelSearch();
    }
    let [promise, cancel] = this.fetchWithCancellation(`/api/v2/search?${params.toString()}`);
    cancelSearch = cancel;
    return promise;
  }
  static filter(q, version = null) {
    let params = new URLSearchParams();
    params.set("q", q);
    if (version) {
      params.set("v", version);
    }
    if (cancelFilter) {
      cancelFilter();
    }
    let [promise, cancel] = this.fetchWithCancellation(`/api/v2/filter?${params.toString()}`);
    cancelFilter = cancel;
    return promise;
  }
  static fetch(url, type = "json") {
    let [promise] = this.fetchWithCancellation(url, type);
    return promise;
  }
  static fetchWithCancellation(url, type = "json") {
    return this._fetch(url, type);
  }
  static _fetch(url, type = "json") {
    let cancel;
    let promise = new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.responseType = type;
      cancel = () => {
        reject("Request was cancelled");
        xhr.abort();
      };
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          let first = xhr.status.toString().charAt(0);
          if (first !== "2" && first !== "3") {
            if (type === "json") {
              try {
                reject(new Error(`Fetching '${url}' failed :-S: ${xhr.response.message}`));
              } catch (e) {
                reject(new Error(`Fetching '${url}' failed :-S: ${xhr.statusText}`));
              }
            } else {
              reject(new Error(`Fetching '${url}' failed :-S: ${xhr.statusText}`));
            }
            return;
          }
          resolve(xhr.response);
        }
      });
      xhr.addEventListener("error", (ev) => {
        reject(new Error(`Fetching '${url}' failed :-S: ${ev}`));
      });
      xhr.open("GET", url);
      xhr.setRequestHeader("Accept", type === "json" ? "application/json" : "*/*");
      xhr.send();
    });
    return [promise, cancel];
  }
  static ping(url) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === 4) {
          let first = xhr.status.toString().charAt(0);
          if (first !== "2" && first !== "3" && first !== "4") {
            reject(new Error(`Pinging '${url}' failed :-S: ${xhr.statusText}`));
          } else {
            resolve(first === "2" || first === "3");
          }
        }
      });
      xhr.addEventListener("error", (ev) => {
        reject(new Error(`Pinging '${url}' failed :-S: ${ev}`));
      });
      xhr.open("HEAD", url);
      xhr.send();
    });
  }
};

// pnp:/Users/mariuswilms/Code/dsk/js-sdk/src/Doc.js
var DocTransformer = class {
  constructor(html, transforms = {}, orphans = [], options = {}) {
    this.html = html;
    this.transforms = {};
    let key;
    let keys = Object.keys(transforms);
    let n = keys.length;
    while (n--) {
      key = keys[n];
      this.transforms[key.toLowerCase()] = transforms[key];
    }
    this.orphans = orphans;
    let defaults = {
      isPreformatted: (type) => type === "pre",
      noTransform: () => null
    };
    this.options = Object.assign({}, defaults, options);
  }
  compile() {
    let start = performance.now();
    let body = document.createElement("body");
    body.innerHTML = this.html;
    body.innerHTML = this.orphan(body);
    this.clean(body);
    let children = [];
    body.childNodes.forEach((c) => {
      let t = this.transform(c);
      if (t) {
        children.push(t);
      }
    });
    console.log(`Document compilation with ${children.length} node/s took ${performance.now() - start}ms`);
    return children;
  }
  orphan(root) {
    if (!this.orphans) {
      return root.innerHTML;
    }
    let orphans = root.querySelectorAll(this.orphans.join(","));
    orphans.forEach((c) => {
      console.log(`Unwrapping ${c} from ${c.parentNode}`);
      c.parentNode.parentNode.insertBefore(c, c.parentNode);
    });
    return root.innerHTML;
  }
  clean(root) {
    root.querySelectorAll("p:empty").forEach((el) => {
      el.remove();
    });
  }
  transform(node) {
    if (node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim()) {
      if (node.nodeValue !== " ") {
        return null;
      }
    }
    if (!node.tagName) {
      return node.textContent;
    }
    let type = node.tagName.toLowerCase();
    let props = { children: [] };
    let apply = this.transforms[type];
    for (let i = 0; i < node.attributes.length; i++) {
      props[node.attributes[i].name] = node.attributes[i].value;
    }
    if (this.options.isPreformatted(type)) {
      props.children = node.innerHTML;
    } else {
      node.childNodes.forEach((c) => {
        let t = this.transform(c);
        if (t) {
          props.children.push(t);
        }
      });
      if (!props.children.length) {
        props.children = node.textContent || void 0;
      }
    }
    if (!props.key) {
      props.key = Math.random();
    }
    if (!apply) {
      if (this.options.noTransform) {
        return this.options.noTransform(type, props);
      }
      console.log(`No transform to apply to ${type}`);
    }
    return apply(props);
  }
};
function transform(html, transforms = {}, orphans = [], options = {}) {
  return new DocTransformer(html, transforms, orphans, options).compile();
}

// pnp:/Users/mariuswilms/Code/dsk/js-sdk/src/Tree.js
var Tree = class {
  constructor(root) {
    this.root = root;
  }
  sync() {
    return Client.tree().then((data) => {
      this.root = data.root;
    });
  }
  flatten(node = null) {
    let list = [];
    ((node || this.root).children || []).each((child) => {
      list.push(child);
      list = list.concat(this.flatten(child));
    });
    return list;
  }
  filteredBy(selectedURLs = []) {
    let tree = new Tree(JSON.parse(JSON.stringify(this.root)));
    if (selectedURLs) {
      let check = (n) => selectedURLs.includes(n.url) || n.children.some(check);
      let select = (n) => {
        if (selectedURLs.includes(n.url)) {
          return true;
        }
        n.children = n.children.filter(select);
        return n.children.some(check);
      };
      tree.root.children = tree.root.children.filter(select);
    }
    return tree;
  }
};
export {
  Client,
  Tree,
  transform
};
//# sourceMappingURL=index.js.map
