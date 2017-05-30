const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const MiniMeToken = artifacts.require("MiniMeToken");
const PollManager = artifacts.require("PollManager");

const SingleChoiceFactory = artifacts.require("SingleChoiceFactory");
const SingleChoice = artifacts.require("SingleChoice");
const utils = require("../js/utils.js");
const assertFail = require("./helpers/assertFail");

contract("PollManager", (accounts) => {
    let token;
    let tokenFactory;
    let pollManager;
    let singleChoiceFactory;
    let voteToken;
    let pollContract;
    let ballot0;
    let ballot1;
    let ballot20;
    let ballot21;
    let ballot22;
    let voteToken2;
    let pollContract2;
    it("should create a token and assign some values", async () => {
        tokenFactory = await MiniMeTokenFactory.new();
        token = await MiniMeToken.new(
            tokenFactory.address,
            0,
            0,
            "Test Token",
            1,
            "TTK",
            false);
        await token.generateTokens(accounts[ 0 ], 1000);
        await token.generateTokens(accounts[ 1 ], 2000);
        await token.generateTokens(accounts[ 2 ], 3000);
    });
    it("should deploy a poll manager", async () => {
        pollManager = await PollManager.new(tokenFactory.address);
    });
    it("should deploy SingleChoice Poll", async () => {
        singleChoiceFactory = await SingleChoiceFactory.new();

        const curBlock = await getBlockNumber();

        await pollManager.addPoll(
            token.address,
            curBlock + 10,
            curBlock + 20,
            singleChoiceFactory.address,
            utils.singleChoiceDef("Question", [ "Option1", "Option2" ]));

        const nPolls = await pollManager.nPolls();
        assert.equal(1, nPolls);

        const res = await pollManager.poll(0);

        assert.equal(curBlock + 10, res[ 0 ]); // startBlock
        assert.equal(curBlock + 20, res[ 1 ]); // endBlock

        voteToken = MiniMeToken.at(res[ 2 ]);
        pollContract = SingleChoice.at(res[ 3 ]);

        assert.equal(false, res[ 4 ]);  // canceled
        assert.equal("SINGLE_CHOICE", web3.toAscii(res[ 5 ]).substring(0, "SINGLE_CHOICE".length));  // pollType
        assert.equal("Question", res[ 6 ]);  // canceled
        assert.equal(false, res[ 7 ]); // finalized
        assert.equal(6000, res[ 8 ]); // totalCensus

        const vtName = await voteToken.name();
        assert.equal("Test Token_0", vtName);
        const vtSymbol = await voteToken.symbol();
        assert.equal("TTK_0", vtSymbol);

        const pcOwner = await pollContract.owner();

        assert.equal(pollManager.address, pcOwner);

        ballot0 = await pollContract.getBallot(0);

        ballot1 = await pollContract.getBallot(1);
    });
    it("should not be able to vote before start", async () => {
        try {
            await pollManager.vote(0, ballot0);
        } catch (error) {
            assertFail(error);
        }
    });
    it("should be able vote after start", async () => {
        await mineNBlocks(10);

        await pollManager.vote(0, ballot0);
        const res = await pollManager.getVote(0, accounts[ 0 ]);

        assert.equal(ballot0, res[ 0 ]);
        assert.equal(1000, res[ 1 ].toNumber());

        const v0 = await pollContract.result(0);
        const v1 = await pollContract.result(1);
        assert.equal(1000, v0.toNumber());
        assert.equal(0, v1.toNumber());
    });
    it("should be able to revote", async () => {
        await pollManager.vote(0, ballot1);
        const res = await pollManager.getVote(0, accounts[ 0 ]);

        assert.equal(ballot1, res[ 0 ]);
        assert.equal(1000, res[ 1 ].toNumber());

        const v0 = await pollContract.result(0);
        const v1 = await pollContract.result(1);
        assert.equal(0, v0.toNumber());
        assert.equal(1000, v1.toNumber());
    });
    it("should be able to unvote", async () => {
        await pollManager.unvote(0);
        const res = await pollManager.getVote(0, accounts[ 0 ]);

        assert.equal(0, res[ 0 ]);
        assert.equal(0, res[ 1 ].toNumber());

        const v0 = await pollContract.result(0);
        const v1 = await pollContract.result(1);
        assert.equal(0, v0.toNumber());
        assert.equal(0, v1.toNumber());
    });
    it("should be able to vote 3 persons", async () => {
        await pollManager.vote(0, ballot0, { from: accounts[ 0 ] });
        await pollManager.vote(0, ballot0, { from: accounts[ 1 ] });
        await pollManager.vote(0, ballot1, { from: accounts[ 2 ] });

        const res0 = await pollManager.getVote(0, accounts[ 0 ]);
        assert.equal(ballot0, res0[ 0 ]);
        assert.equal(1000, res0[ 1 ].toNumber());

        const res1 = await pollManager.getVote(0, accounts[ 1 ]);
        assert.equal(ballot0, res1[ 0 ]);
        assert.equal(2000, res1[ 1 ].toNumber());

        const res2 = await pollManager.getVote(0, accounts[ 2 ]);
        assert.equal(ballot1, res2[ 0 ]);
        assert.equal(3000, res2[ 1 ].toNumber());

        const v0 = await pollContract.result(0);
        const v1 = await pollContract.result(1);
        assert.equal(3000, v0.toNumber());
        assert.equal(3000, v1.toNumber());
    });
    it("Should not allow vote a not defined poll", async () => {
        try {
            await pollManager.vote(1, ballot0);
        } catch (error) {
            assertFail(error);
        }
    });
    it("should not be able to vote after end", async () => {
        await mineNBlocks(10);

        const res = await pollManager.poll(0);

        assert.equal(true, res[ 7 ]);

        try {
            await pollManager.vote(0, ballot0);
        } catch (error) {
            assertFail(error);
        }
    });
    it("should not be able to create a poll that's already terminated", async () => {
        const curBlock = await getBlockNumber();

        try {
            await pollManager.addPoll(
                token.address,
                curBlock - 10,
                curBlock - 5,
                singleChoiceFactory.address,
                utils.singleChoiceDef("Question2", [ "Option1", "Option2" ]));
            assert.equal(true, false);
        } catch (error) {
            assertFail(error);
        }
    });
    it("should create another poll", async () => {
        const curBlock = await getBlockNumber();

        await pollManager.addPoll(
            token.address,
            curBlock - 10,
            curBlock + 20,
            singleChoiceFactory.address,
            utils.singleChoiceDef("Question2", [ "Option1", "Option2", "Question3" ]));

        const nPolls = await pollManager.nPolls();
        assert.equal(2, nPolls);

        const res = await pollManager.poll(1);

        voteToken2 = MiniMeToken.at(res[ 2 ]);
        pollContract2 = SingleChoice.at(res[ 3 ]);

        ballot20 = await pollContract2.getBallot(0);
        ballot21 = await pollContract2.getBallot(1);
        ballot22 = await pollContract2.getBallot(2);
    });
    it("should vote after start", async () => {
        await pollManager.vote(1, ballot22);
        const res = await pollManager.getVote(1, accounts[ 0 ]);

        assert.equal(ballot22, res[ 0 ]);
        assert.equal(1000, res[ 1 ].toNumber());

        const v0 = await pollContract2.result(0);
        const v1 = await pollContract2.result(1);
        const v2 = await pollContract2.result(2);
        assert.equal(0, v0.toNumber());
        assert.equal(0, v1.toNumber());
        assert.equal(1000, v2.toNumber());
    });
    it("Should not be able to vote with an invalid ballot", async () => {
        try {
            await pollManager.vote(1, ballot0);
        } catch (error) {
            assertFail(error);
        }
    });
    it("should not be able to vote after cancel", async () => {
        await pollManager.cancelPoll(1);
        try {
            await pollManager.vote(1, ballot20);
        } catch (error) {
            assertFail(error);
        }
    });
    it("Should not be able to cancel a finalized poll", async () => {
        await pollManager.cancelPoll(1);

        const res = await pollManager.poll(1);

        assert.equal(true, res[ 4 ]);

        try {
            await pollManager.cancelPoll(0);
        } catch (error) {
            assertFail(error);
        }
    });
    async function mineNBlocks(n) {
        for (let i = 0; i < n; i++) {
            await mineBlock();
        }
    }

    function mineBlock() {
        return new Promise((resolve, reject) => {
            send("evm_mine", (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    }

    // CALL a low level rpc
    function send(method, params, callback) {
        if (typeof params == "function") {
          callback = params;
          params = [];
        }

        web3.currentProvider.sendAsync({
          jsonrpc: "2.0",
          method: method,
          params: params || [],
          id: new Date().getTime()
        }, callback);
    }

    function getBlockNumber() {
        return new Promise( (resolve, reject) => {
            web3.eth.getBlockNumber( (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(res);
            });
        });
    }
});
