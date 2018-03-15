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

const replacer = (str, full, name, device, offset, s) => {
  /**
    Separate with ":" to avoid confusing space or character
    And Hoping this ":" is not used in name or device or we 're doomed !
  */
  value = name + ":" + device;
  return value;
};

const listNetworkServices = () => {
  /**
    return a dict with network service as key and the device name
    as value
    E.g: {'Wi-Fi': 'en0'}
  */

  let dict = {};
  cmd = execSync("networksetup -listnetworkserviceorder");
  // Each service is listed on two lines
  const search = /((?:\([0-9]\)) ([a-z-A-Z].*)\n(?:\(Hardware .*Device: )(.*)\)\n)/g;
  let blocks = cmd.toString().replace(search, replacer);
  blocks = blocks.replace(/An asterisk .*\n/g, ""); //remove unnecessary string

  services = blocks.split("\n"); // My Good ! So we can iter this ?

  services.forEach(line => {
    if (line) {
      service = line.split(":"); // confusing space or character
      dict[service[0]] = service[1];
    }
  });

  return dict;
};

exports.getCurrentDns = () => {
  return new Promise((resolve, reject) => {
    blocks = listNetworkServices();

    let settings = [];
    let promises = [];
    try {
      for (let srv in blocks) {
        active = link_is_configured(blocks[srv]);
        if (active) {
          let interfaces = {};
          interfaces.link = blocks[srv];
          interfaces.name = srv;
          interfaces.dns = get_link_dns(interfaces);
          settings.dns = interfaces.dns;
          settings.push(interfaces);
        }
      }
    } catch (err) {
      reject(err);
    }
    resolve(settings);
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
      cmd = "ping -t 1 -c 1 " + host;
      try {
        ping = execSync(cmd);
        resolve("success");
      } catch (err) {
        reject(new Error(host + " has to be an IP or a FQDN"));
      }
    }
  });
};
