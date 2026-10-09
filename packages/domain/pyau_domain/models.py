from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Need = Literal["water", "shade", "toilet", "charging", "food"]


class Policy(BaseModel):
    id: str
    validationStatus: str = "unvalidated_demo_policy"
    heatMetric: str = "apparent_temperature_c"
    heatThresholdC: float = 42
    coverageRadiusMeters: int = 500
    need: Need = "water"
    maxCandidatesPerCluster: int = 3
    maxAsksPerHostPerDay: int = 1
    askTimeoutSecondsLive: int = 1200
    askTimeoutSecondsDemo: int = 45
    pauseAfterProblemReports: int = 2
    pauseWindowHours: int = 3


class Host(BaseModel):
    id: str
    label: str
    kind: Literal["listed", "standby"]
    lat: float
    lng: float
    offers: list[Need]
    hours: tuple[str, str]
    paused: bool = False
    pausedReason: Optional[str] = None
    consentToAsks: bool = True


class Availability(BaseModel):
    """A host is live on a date only inside an availability window (half-open [start, end))."""

    model_config = ConfigDict(frozen=True)

    hostId: str
    date: str
    window: tuple[str, str]
    source: Literal["listed_confirmed", "accepted_ask"]

    @property
    def id(self) -> str:
        return f"{self.hostId}:{self.date}:{self.source}"


class DemandRecord(BaseModel):
    id: str
    clusterId: str
    lat: float
    lng: float
    hour: str
    need: Need = "water"


class ClusterCoverage(BaseModel):
    requests: int
    covered: int
    nearestHostId: Optional[str] = None
    distanceM: Optional[int] = None


class CoverageReport(BaseModel):
    window: tuple[str, str]
    total: int
    covered: int
    percent: Optional[float]  # None when there are no requests
    byCluster: dict[str, ClusterCoverage]
    uncoveredClusters: list[str]


class HeatOutlook(BaseModel):
    status: Literal["OK", "INSUFFICIENT_DATA", "NO_HEAT"]
    window: Optional[tuple[str, str]] = None
    peakC: Optional[float] = None
    missingHours: list[str] = Field(default_factory=list)
