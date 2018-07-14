const os = require("os");
const exec = require("child_process").exec;
const execSync = require("child_process").execSync;
const Store = require("electron-store");
const sudo = require("sudo-prompt");
const validator = require("validator");
const log = require("electron-log");

const options = {
  name: "OpenNic DNS",
};

const store = new Store();

const link_is_configured = name => {
  const devices = os.networkInterfaces();

  for (device in devices) {
    if (device === name) {
      for (obj in devices[device]) {
        if (devices[device][obj]["family"] === "IPv4") {
          return name;
        }
      }
    }
  }
};

let get_link_dns = interfaces => {
  cmd = "networksetup -getdnsservers " + "'" + interfaces.name + "'";
  n = execSync(cmd);
  n = n
    .toString()
    .split("\n")
    .filter(Boolean);

  /**
    If DNS are set throw DHCP, networksetup does not return correct values
    Try to get DNS servers with ipconfig command
  */

  if (n[0].match(/any DNS Servers/)) {
    cmd = "ipconfig getpacket " + interfaces.link;
    l = execSync(cmd);
    res = l
      .toString()
      .match(/domain_name_server.*/)[0]
      .split(":")[1]
      .replace(/{|}/g, "")
      .trim()
      .split(",");
  } else {
    res = n;
  }
  return res;
};

exports.getCurrentDns = () => {
  return new Promise((resolve, reject) => {
    cmd = execSync("networksetup -listallhardwareports");
    let blocks = cmd
      .toString()
      .split(/Hardware/)
      .slice(1);

    let settings = [];
    let promises = [];

    promises.push(
      blocks.forEach(block => {
        let name = block.match(/Port: (.+)/);
        let link = block.match(/Device: (\w+)/);
        active = link_is_configured(link[1]);
        if (active) {
          let interfaces = {};
          interfaces.link = link[1];
          interfaces.name = name[1];
          interfaces.dns = get_link_dns(interfaces);
          settings.dns = interfaces.dns;
          settings.push(interfaces);
        }
      })
    );
    Promise.all(promises)
      .then(() => {
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
      "networksetup -setdnsservers " +
      "'" +
      device_name +
      "' " +
      dns_servers +
      " && echo 'success'";

    sudo.exec(cmd, options, function(error, stdout, stderr) {
      if (error) {
        log.error("CMD error: ");
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
        let dns = store.get("opennic_servers");
        let openic_dns_servers = [dns[0].ip + " " + dns[1].ip];
        for (i in config) {
          writeDns(openic_dns_servers, config[i]["name"])
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
          let default_dns = config[i]["dns"].toString().replace(/,/g, " ");
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

exports.ping = host => {
  return new Promise((resolve, reject) => {
    if (validator.isIP(host) || validator.isFQDN(host)) {
      cmd = "ping -t 5 -c 1 " + host;
      try {
        ping = execSync(cmd);
        resolve("success");
      } catch (err) {
        reject(new Error(host + " is not reachable"));
      }
    } else {
      reject(new Error(host + " has to be an IP or a FQDN"));
    }
  });
};
