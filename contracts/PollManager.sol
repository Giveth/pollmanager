pragma solidity ^0.4.11;

import "./Owned.sol";
import "./LowLevelStringManipulator.sol";
import "./MiniMeToken.sol";

contract IPollContract {
    function deltaVote(int _amount, bytes32 _ballot) returns (bool _succes);
    function pollType() constant returns (bytes32);
    function question() constant returns (string);
}

contract IPollFactory {
    function create(bytes _description) returns(address);
}

contract PollManager is LowLevelStringManipulator, Owned {

    struct VoteLog {
        bytes32 ballot;
        uint amount;
    }

    struct Poll {
        uint startBlock;
        uint endBlock;
        address token;
        address pollContract;
        bool canceled;
        mapping(address => VoteLog) votes;
    }

    Poll[] _polls;

    MiniMeTokenFactory public tokenFactory;

    function PollManager(address _tokenFactory) {
        tokenFactory = MiniMeTokenFactory(_tokenFactory);
    }

    function addPoll(
        address _token,
        uint _startBlock,
        uint _endBlock,
        address _pollFactory,
        bytes _description) onlyOwner returns (uint _idPoll)
    {
        if (_endBlock <= _startBlock) throw;
        if (_endBlock <= getBlockNumber()) throw;
        _idPoll = _polls.length;
        _polls.length ++;
        Poll p = _polls[ _idPoll ];
        p.startBlock = _startBlock;
        p.endBlock = _endBlock;


        var (name,symbol) = getTokenNameSymbol(_token);
        string memory proposalName = strConcat(name , "_", uint2str(_idPoll));
        string memory proposalSymbol = strConcat(symbol, "_", uint2str(_idPoll));

        p.token = tokenFactory.createCloneToken(
            _token,
            _startBlock - 1,
            proposalName,
            MiniMeToken(_token).decimals(),
            proposalSymbol,
            true);


        p.pollContract = IPollFactory(_pollFactory).create(_description);

        if (p.pollContract == 0) throw;
    }

    function cancelPoll(uint _idPoll) onlyOwner {
        if (_idPoll >= _polls.length) throw;
        Poll p = _polls[_idPoll];
        if (getBlockNumber() >= p.endBlock) throw;
        p.canceled = true;
        PollCanceled(_idPoll);
    }

    function vote(uint _idPoll, bytes32 _ballot) {
        if (_idPoll >= _polls.length) throw;
        Poll p = _polls[_idPoll];
        if (getBlockNumber() < p.startBlock) throw;
        if (getBlockNumber() >= p.endBlock) throw;
        if (p.canceled) throw;

        unvote(_idPoll);

        uint amount = MiniMeToken(p.token).balanceOf(msg.sender);

        if (amount == 0) throw;


//        enableTransfers = true;
        if (!MiniMeToken(p.token).transferFrom(msg.sender, address(this), amount)) throw;
//        enableTransfers = false;

        p.votes[msg.sender].ballot = _ballot;
        p.votes[msg.sender].amount = amount;

        if (!IPollContract(p.pollContract).deltaVote(int(amount), _ballot)) throw;

        Vote(_idPoll, msg.sender, _ballot, amount);
    }

    function unvote(uint _idPoll) {
        if (_idPoll >= _polls.length) throw;
        Poll p = _polls[_idPoll];
        if (getBlockNumber() < p.startBlock) throw;
        if (getBlockNumber() > p.endBlock) throw;
        if (p.canceled) throw;

        uint amount = p.votes[msg.sender].amount;
        bytes32 ballot = p.votes[msg.sender].ballot;
        if (amount == 0) return;

        if (!IPollContract(p.pollContract).deltaVote(-int(amount), ballot)) throw;


        p.votes[msg.sender].ballot = 0;
        p.votes[msg.sender].amount = 0;

//        enableTransfers = true;
        if (!MiniMeToken(p.token).transferFrom(address(this), msg.sender, amount)) throw;
//        enableTransfers = false;

        Unvote(_idPoll, msg.sender, ballot, amount);
    }

// Constant Helper Function

    function nPolls() constant returns(uint) {
        return _polls.length;
    }

    function poll(uint _idPoll) constant returns(
        uint _startBlock,
        uint _endBlock,
        address _token,
        address _pollContract,
        bool _canceled,
        bytes32 _pollType,
        string _question,
        bool _finalized,
        uint _totalCensus
    ) {
        if (_idPoll >= _polls.length) throw;
        Poll p = _polls[_idPoll];
        _startBlock = p.startBlock;
        _endBlock = p.endBlock;
        _token = p.token;
        _pollContract = p.pollContract;
        _canceled = p.canceled;
        _pollType = IPollContract(p.pollContract).pollType();
        _question = getString(p.pollContract, bytes4(sha3("question()")));
        _finalized = (!p.canceled) && (getBlockNumber() >= _endBlock);
        _totalCensus = MiniMeToken(p.token).totalSupply();
    }

    function getVote(uint _idPoll, address _voter) constant returns (bytes32 _ballot, uint _amount) {
        if (_idPoll >= _polls.length) throw;
        Poll p = _polls[_idPoll];

        _ballot = p.votes[_voter].ballot;
        _amount = p.votes[_voter].amount;
    }

    function proxyPayment(address ) payable returns(bool) {
        return false;
    }


    function onTransfer(address , address , uint ) returns(bool) {
        return true;
    }

    function onApprove(address , address , uint ) returns(bool) {
        return true;
    }


    function getBlockNumber() internal constant returns (uint) {
        return block.number;
    }

    event Vote(uint indexed idPoll, address indexed _voter, bytes32 ballot, uint amount);
    event Unvote(uint indexed idPoll, address indexed _voter, bytes32 ballot, uint amount);
    event PollCanceled(uint indexed idPoll);



}
