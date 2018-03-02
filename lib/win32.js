const os = require("os");
const execSync = require("child_process").execSync;
const Store = require("electron-store");
const sudo = require("sudo-prompt");
const validator = require("validator");
const log = require("electron-log");

const options = {
  name: "OpenNic DNS",
};
const store = new Store();

exports.ping = host => {
  return new Promise((resolve, reject) => {
    if (validator.isIP(host) || validator.isFQDN(host)) {
      cmd = "ping -n 1 " + host + " >null 2>&1 && echo success || echo down";
      ping = execSync(cmd);
      resolve(ping.toString().trim());
    } else {
      reject(new Error(host + " has to be an IP or a FQDN"));
    }
  });
};

const getLinkDNS = iface => {
  cmd = "netsh interface ip show dnsservers " + iface;
  getInterfaceDNS = execSync(cmd);
  const v4 =
    "(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(?:\\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])){3}";
  const re = new RegExp(v4, "g");
  dns = getInterfaceDNS.toString().match(re);
  return dns;
};

const getLink = () => {
  cmd = "netsh interface ip show interface";

  return new Promise((resolve, reject) => {
    try {
      const i = /(.*)(connected)(  ){1,}\s(\w+)/;
      const re = new RegExp(i, "g");
      let blocks = execSync(cmd);
      let block = blocks.toString("utf-8").match(re);
      let settings = [];

      block.forEach(b => {
        let c = b.replace(i, "$4");
        if (!c.includes("Loopback")) {
          let iface = {};
          let dns = getLinkDNS(c);
          iface.name = c;
          iface.dns = dns;
          settings.push(iface);
          settings.dns = dns;
        }
      });
      resolve(settings);
    } catch (err) {
      reject(err);
    }
  });
};

exports.getCurrentDns = () => {
  return new Promise((resolve, reject) => {
    getLink()
      .then(settings => {
        resolve(settings);
      })
      .catch(err => {
        reject(err);
      });
  });
};

const writeDns = (dns_servers, device_name) => {
  return new Promise((resolve, reject) => {
    cmd =
      "netsh interface ipv4 set dnsservers " +
      device_name +
      " static " +
      dns_servers[0] +
      " primary && netsh interface ip add dns " +
      device_name +
      " " +
      dns_servers[1] +
      " index=2 && echo success";

    sudo.exec(cmd, options, function(error, stdout, stderr) {
      if (error) {
        log.error(error);
        reject(error);
      }
      resolve(stdout);
    });
  });
};

exports.setDns = status => {
  return new Promise((resolve, reject) => {
    let config = store.get("default_config");

    switch (status) {
      case "enable":
        let opennic_servers = store.get("opennic_servers");
        let dns = [];
        dns.push(opennic_servers[0].ip);
        dns.push(opennic_servers[1].ip);
        for (i in config) {
          writeDns(dns, config[i]["name"])
            .then(result => {
              resolve(result);
            })
            .catch(err => {
              reject(err);
            });
        }
        break;

      case "disable":
        for (i in config) {
          let default_dns = config[i]["dns"];
          writeDns(default_dns, config[i]["name"])
            .then(result => {
              resolve(result);
            })
            .catch(err => {
              reject(err);
            });
        }
        break;
    }
  });
};
