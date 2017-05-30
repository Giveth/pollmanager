module.exports = (error) => {
    if (error.message.search("invalid opcode")) return;
    if (error.message.search("invalid JUMP")) return;
    assert.ok(false, "Transaction should fail");
};
