from pydantic import BaseModel, Field, IPvAnyAddress
from typing import List, Optional
from datetime import datetime
from bson.objectid import ObjectId
from pydantic import ValidationInfo
from ipaddress import IPv4Address, IPv6Address


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, value, _: ValidationInfo):
        if not ObjectId.is_valid(value):
            raise ValueError(f"Invalid ObjectId: {value}")
        return ObjectId(value)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema):
        schema.update(type="string")


# Nested Models
class OSInfo(BaseModel):
    cpus: int = Field(..., description="Number of CPUs")
    kernel: str = Field(..., description="Kernel name")
    core: str = Field(..., description="Kernel core version")
    platform: str = Field(..., description="Platform name")
    os: str = Field(..., description="Operating system")


class NetInterface(BaseModel):
    name: str = Field(..., description="Network interface name")
    ips: List[IPvAnyAddress] = Field(default=[], description="List of IP addresses")

    def dict(self, *args, **kwargs):
        """Convert IP addresses to strings during serialization."""
        serialized = super().dict(*args, **kwargs)
        serialized["ips"] = [str(ip) for ip in self.ips]
        return serialized


class ClientInfo(BaseModel):
    processid: int = Field(..., description="Process ID")
    ipaddress: str = Field(..., description="IP address and port")
    netinterfaces: List[NetInterface] = Field(
        default=[], description="Network interfaces"
    )
    osinfo: OSInfo = Field(..., description="Operating system information")
    codename: str = Field(..., description="Code name of the client")
    hostname: str = Field(..., description="Host name of the client")
    username: str = Field(..., description="User name of the client")


# Main Agent Model
class AgentModel(BaseModel):
    id: PyObjectId = Field(
        default_factory=PyObjectId, alias="_id", description="MongoDB ObjectId"
    )
    agent_id: str = Field(..., description="Agent ID (UUID)")
    client_info: ClientInfo = Field(..., description="Client information")
    # sleeptime: int = Field(..., description="Sleep time in microseconds")
    # lastseen: datetime = Field(..., description="Last seen timestamp")
    # needsupdate: bool = Field(..., description="Indicates if the agent needs an update")
    # otherclientinfo: Optional[dict] = Field(None, description="Other client info if available")
    # status: str = Field(..., description="Agent status")
    # sleeptime_float: Optional[float] = Field(alias="SleepTime", description="Sleep time as a float")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "_id": "64309628d1cd938d5163ad49",
                "sleeptime": 60000000,
                "agent_id": "c7cec2c7-55a8-4c47-bb92-a538b6a0726c",
                "client_info": {
                    "processid": 41290,
                    "ipaddress": "127.0.0.1:50358",
                    "netinterfaces": [
                        {"name": "lo", "ips": ["127.0.0.1", "::1"]},
                        {
                            "name": "wlan0",
                            "ips": ["192.168.178.106", "fe80::13ab:7545:45c8:a1a"],
                        },
                    ],
                    "osinfo": {
                        "cpus": 16,
                        "kernel": "Linux",
                        "core": "6.2.8-arch1-1",
                        "platform": "unknown",
                        "os": "GNU/Linux",
                    },
                    "codename": "daring-giraffe",
                    "hostname": "hotzenplotz",
                    "username": "christophk",
                },
                "lastseen": "2023-12-06T14:34:45.417+0000",
                "needsupdate": False,
                "otherclientinfo": None,
                "status": "stopped",
                "SleepTime": 60000000.0,
            }
        }

    def dict(self, *args, **kwargs):
        """Custom serialization to handle nested IP addresses."""
        data = super().dict(*args, **kwargs)
        # Serialize IP addresses in nested fields
        for iface in data["client_info"]["netinterfaces"]:
            iface["ips"] = [str(ip) for ip in iface["ips"]]
        return data
