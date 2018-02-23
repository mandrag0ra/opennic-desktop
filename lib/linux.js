const os = require("os");
const execSync = require("child_process").execSync;
const fs = require("fs");
const Store = require("electron-store");
const sudo = require("sudo-prompt");
const validator = require("validator");

const options = {
  name: "OpenNic DNS",
};
const store = new Store();

exports.ping = host => {
  return new Promise((resolve, reject) => {
    if (validator.isIP(host) || validator.isFQDN(host)) {
      cmd =
        "ping -c 1 " +
        host +
        ' >/dev/null 2>&1 && echo "success" || echo "down"';
      ping = execSync(cmd);
      resolve(ping.toString().trim());
    } else {
      reject(new Error(host + " has to be an IP or a FQDN"));
    }
  });
};

exports.getCurrentDns = () => {
  return new Promise((resolve, reject) => {
    try {
      cmd = "cat /etc/resolv.conf";
      let blocks = execSync(cmd);
      let block = blocks
        .toString()
        .split(/nameserver/)
        .slice(1);

      let settings = {};
      let res = [];

      block.forEach(i => {
        res.push(i.trim());
      });
      settings.dns = res;
      resolve(settings);
    } catch (err) {
      reject(err);
    }
  });
};

exports.setDns = status => {
  return new Promise((resolve, reject) => {
    let config = store.get("default_config");
    const stream = fs.createWriteStream("/tmp/opennic_resolv.conf");

    switch (status) {
      case "enable":
        let dns = store.get("opennic_servers");
        let openic_dns_servers = [dns[0].ip + " " + dns[1].ip];

        stream.once("open", fd => {
          stream.write("nameserver " + dns[0].ip + "\n");
          stream.write("nameserver " + dns[1].ip + "\n");

          stream.end();
          cmd =
            'cp /tmp/opennic_resolv.conf /etc/resolv.conf && echo "success" || echo "failed"';
          sudo.exec(cmd, options, function(error, stdout, stderr) {
            if (error) {
              reject(error);
            }
            resolve(stdout);
          });
        });

        break;

      case "disable":
        stream.once("open", fd => {
          for (i in config.dns) {
            stream.write("nameserver " + config.dns[i] + "\n");
          }

          stream.end();
          cmd =
            'cp /tmp/opennic_resolv.conf /etc/resolv.conf && echo "success" || echo "failed"';
          sudo.exec(cmd, options, function(error, stdout, stderr) {
            if (error) {
              reject(error);
            }
            resolve(stdout);
          });
        });
        break;
    }
  });
};
