pragma solidity ^0.8.0;

contract Healthcare {
    struct PatientRecord {
        string id;
        string dataHash; // Hash of health records
        address owner;
    }

    mapping(string => PatientRecord) public records;

    function storeRecord(string memory _id, string memory _dataHash) public {
        records[_id] = PatientRecord(_id, _dataHash, msg.sender);
    }

    function getRecord(string memory _id) public view returns (string memory) {
        require(records[_id].owner == msg.sender, "Unauthorized");
        return records[_id].dataHash;
    }
}