var SingleChoiceFactory = artifacts.require("SingleChoiceFactory");
var SingleChoice = artifacts.require("SingleChoice");
var utils = require("../js/utils.js");

contract('SingleChoiceFactory', function(accounts) {
  let singleChoiceFactory;
  let singleChoice;
  it("should deploy SingleChoice", async () => {
    singleChoiceFactory = await SingleChoiceFactory.new();
    const tx = await singleChoiceFactory.create(
      utils.singleChoiceDef("Question", ["Option1", "Option2"]));
    const singleChoiceAddr = tx.logs[tx.receipt.logs.length-1].args.addr;
    singleChoice = SingleChoice.at(singleChoiceAddr);
  });
  it("Should have initialized params", async () => {
    const question = await singleChoice.question();
    assert.equal("Question", question);
    const nOptions = await singleChoice.nOptions();
    assert.equal(nOptions, 2);

    const option1 = await singleChoice.options(0);
    assert.equal("Option1", option1);
    const option2 = await singleChoice.options(1);
    assert.equal("Option2", option2);

    const ballot1 = await singleChoice.getBallot(0);
    const ballot2 = await singleChoice.getBallot(1);

    const isValid1 = await singleChoice.isValid(ballot1);
    assert.equal(true, isValid1);

    const isValid2 = await singleChoice.isValid(ballot2);
    assert.equal(true, isValid2);

    const isValid3 = await singleChoice.isValid(0);
    assert.equal(false, isValid3);
  });
});
