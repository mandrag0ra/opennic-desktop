"use strict";
const Chai = require("chai");
const ChaiHTTP = require("chai-http");
// const Store = require("electron-store");
const osCmd = require("../lib/" + process.platform);
const expect = require("chai").expect;

Chai.should();

describe("Network", () => {
  it("get current DNS configuration and should return at least an array", done => {
    osCmd
      .getCurrentDns()
      .then(data => {
        expect(data).to.be.an("array");
        expect(data).to.have.property("dns");
        done();
      })
      .catch(err => done(err));
  });
  it("ping opennic.org with OS binarie and should return success if connect", () => {
    return osCmd.ping("opennic.org").then(res => {
      expect(res)
        .to.be.a("string")
        .to.equal("success");
    });
  });
  it("ping a malformed host and throw an error", () => {
    return osCmd
      .ping("brfzfrf")
      .then(res => {
        throw new Error("This is not supposed to succeed !");
      })
      .catch(err => {
        expect(err).to.match(/.* has to be an IP or a FQDN/);
      });
  });
  it("ping an IP that is not reachable and throw an error", () => {
    return osCmd
      .ping("1.2.3.4")
      .then(res => {
        throw new Error("This is not supposed to succeed !");
      })
      .catch(err => {
        expect(err).to.match(/.* is not reachable/);
      });
  });
});
