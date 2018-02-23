"use strict";
const Chai = require("chai");
const ChaiHTTP = require("chai-http");
// const Store = require("electron-store");
const osCmd = require("../lib/" + process.platform);
const expect = require("chai").expect;

Chai.should();
Chai.use(ChaiHTTP);

describe("Network", () => {
  it("get current DNS configuration and should return at least an array", done => {
    osCmd
      .getCurrentDns()
      .then(data => {
        expect(data).to.be.an("array");
        expect(data[0]).to.have.property("dns");
        done();
      })
      .catch(err => done(err));
  });
  it("ping opennic.org with OS binarie and should return success if connect", done => {
    osCmd
      .ping("opennic.org")
      .then(res => {
        expect(res).to.be.a("string");
        expect(res).to.match(/^success|down/);
        done();
      })
      .catch(err => done(err));
  });
});
