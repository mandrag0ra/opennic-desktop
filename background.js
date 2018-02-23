// TODO
// get current config:
//  - if OpenNic DNS are in use:
//    - Check every 12h if servers are UP
//    - if one servers is down:
//      - get some new one
//      - update config file
//      - bring to front information to the user ?
//      - update DNS OS servers
//  - If not :
//    - Notification ?

const Store = require("electron-store");
const store = new Store();
const { ipcRenderer, remote } = require("electron");
const validator = require("validator");
// const osCmd = require("./lib/" + process.platform);
const log = require("electron-log");
const dns = require("dns");
const util = require("util");
require("util.promisify").shim();

const lookup = util.promisify(dns.lookup);

const config = store.get("opennic_servers");

const retrieveNewDNS = () => {
  return new Promise((resolve, reject) => {
    ipcRenderer.send("get-opennic-servers", "");
    // TODO
    ipcRenderer.on("get-opennic-servers-reply", (event, res) => {
      if (res) {
        log.debug("get-opennic-servers: SUCCESS");
        resolve(true);
      } else {
        log.debug("get-opennic-servers: FAILED");
        reject(false);
      }
    });
  });
};

const testDNSResolving = host => {
  return new Promise((resolve, reject) => {
    if (validator.isIP(host)) {
      let server = [host];
      dns.setServers(server);
      lookup("opennic.org")
        .then(res => {
          resolve("success");
        })
        .catch(e => {
          reject(e);
        });
    } else {
      reject(new Error(host + " has to be an IP or a FQDN"));
    }
  });
};

// Do not use ping OS command as some Tiers 2 block ICMP requests
const checkDNSReachability = () => {
  log.debug("Check DNS servers availibility");
  const opennicDNS = [config[0].ip, config[1].ip];
  opennicDNS.forEach(dns => {
    testDNSResolving(dns)
      .then(result => {
        if (result == "success") {
          log.debug("DNS server is UP: ", dns);
        }
      })
      .catch(error => {
        log.debug("Error return: ", error);
        log.warn("DNS server is DOWN: ", dns);
        retrieveNewDNS().then(result => {
          if (result) {
            let newConfig = store.get("opennic_servers");
            let newOpennicDNS = [newConfig[0].ip, newConfig[1].ip];
            if (
              newOpennicDNS.length == OpennicDNS.length &&
              opennic_array.some(v => data.dns.indexOf(v) < 0)
            ) {
              let myNotification = new Notification("OpenNic DNS", {
                body: "DNS servers has been changed",
              });
              log.debug("Background Process: New OpenNic DNS servers saved !");
            } else {
              checkDNSReachability();
            }
          } else {
            log.debug(
              "Background Process: Error while saving new OpenNic DNS servers !"
            );
          }
        });
      });
  });
};

log.debug("Launch background process");
// 5 min
setInterval(checkDNSReachability, 300000);
// 5 sec
// setInterval(checkDNSReachability, 5000);
