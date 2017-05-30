pragma solidity ^0.4.11;

import '../../contracts/PollManager.sol';

contract PollManagerMock is PollManager {
  function PollManagerMock (address _tokenFactory) PollManager(_tokenFactory) {
  }

  function getBlockNumber() internal constant returns (uint) {
    return mock_blockNumber;
  }

  function setMockedBlockNumber(uint _b) {
    mock_blockNumber = _b;
  }

  uint mock_blockNumber = 1;
}
