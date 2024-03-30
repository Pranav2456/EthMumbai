// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; 

pragma solidity ^0.8.20;  

contract VerificationTicket {

    struct Ticket { 
        bytes32 dataHash;
        string name;
        string designation;
        uint256 tenure; 
        address issuer; 
        Status status; 
        uint256 timestamp; 
    }

    enum Status { Pending, Approved, Rejected }

    mapping(uint256 => Ticket) public tickets; 
    uint256 public ticketId; 

    event TicketCreated(uint256 indexed ticketId, address indexed issuer, bytes32 dataHash, string name, string designation, uint256 tenure);
    event TicketApproved(uint256 indexed ticketId);
    event TicketRejected(uint256 indexed ticketId, string reason);

    function createTicket(bytes32 _dataHash, string calldata _name, string calldata _designation, uint256 tenure, address _issuer) public  {
        ticketId++; 
        tickets[ticketId] = Ticket({
            dataHash: _dataHash,
            name : _name,
            designation: _designation,
            tenure: tenure,
            issuer: _issuer,
            status: Status.Pending,
            timestamp: block.timestamp 
        });

        emit TicketCreated(ticketId, _issuer, _dataHash, _name, _designation, tenure);
    }

    function approveTicket(uint256 _ticketId) public {
        require(tickets[_ticketId].status == Status.Pending, "Ticket not pending");
        tickets[_ticketId].status = Status.Approved;
        emit TicketApproved(_ticketId);
    }

    function rejectTicket(uint256 _ticketId, string calldata _reason) public {
        require(tickets[_ticketId].status == Status.Pending, "Ticket not pending");
        tickets[_ticketId].status = Status.Rejected;
        emit TicketRejected(_ticketId, _reason);
    }
}