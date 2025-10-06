from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import relationship, sessionmaker, declarative_base, Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, constr
import enum

# ======================
# CONFIGURATION DE LA BD
# ======================
DATABASE_URL = "sqlite:///./iot.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# ======================
# MODELES SQLALCHEMY
# ======================
class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    mac_address = Column(String, unique=True, nullable=False)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    mesures = relationship("Measure", back_populates="device", cascade="all, delete")


class Measure(Base):
    __tablename__ = "measures"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    device_id = Column(Integer, ForeignKey("devices.id"))
    mesure_value = Column(Float, nullable=False)

    device = relationship("Device", back_populates="mesures")

# ======================
# SCHEMAS PYDANTIC
# ======================
class MeasureBase(BaseModel):
    type: constr(strip_whitespace=True)
    mesure_value: float

class MeasureCreate(MeasureBase):
    device_id: int

class MeasureRead(MeasureBase):
    id: int
    date: datetime

    class Config:
        orm_mode = True


class DeviceBase(BaseModel):
    nom: str
    mac_address: str
    location: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceRead(DeviceBase):
    id: int
    created_at: datetime
    mesures: List[MeasureRead] = []

    class Config:
        orm_mode = True

# ======================
# DEPENDANCES
# ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ======================
# APP FASTAPI
# ======================
app = FastAPI(title="IoT Device API", version="1.0")

Base.metadata.create_all(bind=engine)

# ======================
# ROUTES CRUD DEVICES
# ======================
@app.post("/devices/", response_model=DeviceRead)
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    db_device = Device(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@app.get("/devices/", response_model=List[DeviceRead])
def read_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()


@app.get("/devices/{device_id}", response_model=DeviceRead)
def read_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@app.put("/devices/{device_id}", response_model=DeviceRead)
def update_device(device_id: int, updated: DeviceCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    for key, value in updated.dict().items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return device


@app.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"detail": "Device deleted successfully"}

# ======================
# ROUTES CRUD MEASURES
# ======================
@app.post("/measures/", response_model=MeasureRead)
def create_measure(measure: MeasureCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == measure.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db_measure = Measure(**measure.dict())
    db.add(db_measure)
    db.commit()
    db.refresh(db_measure)
    return db_measure


@app.get("/measures/", response_model=List[MeasureRead])
def read_measures(db: Session = Depends(get_db)):
    return db.query(Measure).all()


@app.get("/measures/{measure_id}", response_model=MeasureRead)
def read_measure(measure_id: int, db: Session = Depends(get_db)):
    measure = db.query(Measure).filter(Measure.id == measure_id).first()
    if not measure:
        raise HTTPException(status_code=404, detail="Measure not found")
    return measure


@app.put("/measures/{measure_id}", response_model=MeasureRead)
def update_measure(measure_id: int, updated: MeasureBase, db: Session = Depends(get_db)):
    measure = db.query(Measure).filter(Measure.id == measure_id).first()
    if not measure:
        raise HTTPException(status_code=404, detail="Measure not found")
    for key, value in updated.dict().items():
        setattr(measure, key, value)
    db.commit()
    db.refresh(measure)
    return measure


@app.delete("/measures/{measure_id}")
def delete_measure(measure_id: int, db: Session = Depends(get_db)):
    measure = db.query(Measure).filter(Measure.id == measure_id).first()
    if not measure:
        raise HTTPException(status_code=404, detail="Measure not found")
    db.delete(measure)
    db.commit()
    return {"detail": "Measure deleted successfully"}
