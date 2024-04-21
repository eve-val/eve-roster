let INSTANCE: SectionRepository | null = null;

export const FittingSection = {
  fromInventoryFlag(inventoryFlag: number) {
    return getInstance().getAssignment(inventoryFlag);
  },

  fromSectionName(name: string) {
    return getInstance().getSection(name);
  },
};

function getInstance() {
  if (INSTANCE == null) {
    INSTANCE = buildInstance();
  }
  return INSTANCE;
}

export interface FittingSection {
  type: "slots" | "hold";
  name: string;
  label: string;
  rank: number;
}

export interface SectionAssignment {
  section: FittingSection;
  slotId: number;
}

function buildInstance() {
  const sections = [
    fittingSection("high", "slots", "High slots"),
    fittingSection("mid", "slots", "Mid slots"),
    fittingSection("low", "slots", "Low slots"),
    fittingSection("rig", "slots", "Rigs"),
    fittingSection("subsystem", "slots", "Subsystems"),

    fittingSection("droneBay", "hold", "Drone bay"),
    fittingSection("fighterBay", "hold", "Fighter bay"),
    fittingSection("implant", "hold", "Implants"),
    fittingSection("cargo", "hold", "Cargo"),
    fittingSection("fleetHangar", "hold", "Fleet hangar"),

    fittingSection("subsystemHold", "hold", "Subsystem bay"),
    fittingSection("shipHangar", "hold", "Ship hangar"),

    fittingSection("frigateEscapeBay", "hold", "Frigate escape bay"),
  ];

  const flags = [
    invFlag(5, "Cargo", "cargo", -1),

    invFlag(11, "LowSlot0", "low", 0),
    invFlag(12, "LowSlot1", "low", 1),
    invFlag(13, "LowSlot2", "low", 2),
    invFlag(14, "LowSlot3", "low", 3),
    invFlag(15, "LowSlot4", "low", 4),
    invFlag(16, "LowSlot5", "low", 5),
    invFlag(17, "LowSlot6", "low", 6),
    invFlag(18, "LowSlot7", "low", 7),

    invFlag(19, "MedSlot0", "mid", 0),
    invFlag(20, "MedSlot1", "mid", 1),
    invFlag(21, "MedSlot2", "mid", 2),
    invFlag(22, "MedSlot3", "mid", 3),
    invFlag(23, "MedSlot4", "mid", 4),
    invFlag(24, "MedSlot5", "mid", 5),
    invFlag(25, "MedSlot6", "mid", 6),
    invFlag(26, "MedSlot7", "mid", 7),

    invFlag(27, "HiSlot0", "high", 0),
    invFlag(28, "HiSlot1", "high", 1),
    invFlag(29, "HiSlot2", "high", 2),
    invFlag(30, "HiSlot3", "high", 3),
    invFlag(31, "HiSlot4", "high", 4),
    invFlag(32, "HiSlot5", "high", 5),
    invFlag(33, "HiSlot6", "high", 6),
    invFlag(34, "HiSlot7", "high", 7),

    invFlag(87, "DroneBay", "droneBay", -1),
    invFlag(89, "Implant", "implant", -1),
    invFlag(90, "ShipHangar", "shipHangar", -1),

    invFlag(92, "RigSlot0", "rig", 0),
    invFlag(93, "RigSlot1", "rig", 1),
    invFlag(94, "RigSlot2", "rig", 2),
    invFlag(95, "RigSlot3", "rig", 3),
    invFlag(96, "RigSlot4", "rig", 4),
    invFlag(97, "RigSlot5", "rig", 5),
    invFlag(98, "RigSlot6", "rig", 6),
    invFlag(99, "RigSlot7", "rig", 7),

    invFlag(122, "SecondaryStorage", null, -1),

    invFlag(125, "SubSystem0", "subsystem", 0),
    invFlag(126, "SubSystem1", "subsystem", 1),
    invFlag(127, "SubSystem2", "subsystem", 2),
    invFlag(128, "SubSystem3", "subsystem", 3),
    invFlag(129, "SubSystem4", "subsystem", 4),
    invFlag(130, "SubSystem5", "subsystem", 5),
    invFlag(131, "SubSystem6", "subsystem", 6),
    invFlag(132, "SubSystem7", "subsystem", 7),

    invFlag(155, "FleetHangar", "fleetHangar", -1),
    invFlag(158, "FighterBay", "fighterBay", -1),

    invFlag(169, "FighterTube0", "fighterBay", -1),
    invFlag(170, "FighterTube1", "fighterBay", -1),
    invFlag(171, "FighterTube2", "fighterBay", -1),
    invFlag(172, "FighterTube3", "fighterBay", -1),
    invFlag(173, "FighterTube4", "fighterBay", -1),

    invFlag(177, "SubsystemBay", "subsystemHold", -1),
    invFlag(179, "FrigateEscapeBay", "frigateEscapeBay", -1),
  ];

  return new SectionRepository(sections, flags);
}

class SectionRepository {
  private sections = new Map<string, FittingSection>();
  private assignments = new Map<number, SectionAssignment>();

  constructor(sections: SectionDescriptor[], flags: InvFlagDescriptor[]) {
    for (let i = 0; i < sections.length; i++) {
      const sd = sections[i];
      if (this.sections.has(sd.name)) {
        throw new Error(`Duplicate section name: ${sd.name}`);
      }
      this.sections.set(sd.name, {
        type: sd.type,
        name: sd.name,
        label: sd.label,
        rank: i,
      });
    }

    for (const fd of flags) {
      if (fd.sectionName == null) {
        continue;
      }
      const section = this.sections.get(fd.sectionName);
      if (section == null) {
        throw new Error(`Can't find section ${fd.sectionName}`);
      }
      if (section.type == "slots" && fd.sectionPosition == -1) {
        throw new Error(`Error in flag ${fd.flagId}: position cannot be -1`);
      }
      if (section.type == "hold" && fd.sectionPosition != -1) {
        throw new Error(`Error in flag ${fd.flagId}: position must be -1`);
      }
      this.assignments.set(fd.flagId, {
        section,
        slotId: fd.sectionPosition,
      });
    }
  }

  getAssignment(flag: number): SectionAssignment {
    return this.assignments.get(flag) ?? UNKNOWN_ASSIGMENT;
  }

  getSection(name: string) {
    return this.sections.get(name);
  }
}

const UNKNOWN_ASSIGMENT: SectionAssignment = {
  section: {
    type: "hold",
    name: "unknownHold",
    label: "Unknown hold",
    rank: 1000,
  },
  slotId: -1,
};

function fittingSection(name: string, type: "slots" | "hold", label: string) {
  return {
    name,
    label,
    type,
  };
}

interface SectionDescriptor {
  name: string;
  label: string;
  type: "slots" | "hold";
}

function invFlag(
  flagId: number,
  flagName: string,
  sectionName: string | null,
  sectionPosition: number,
): InvFlagDescriptor {
  return {
    flagId,
    flagName,
    sectionName,
    sectionPosition,
  };
}

interface InvFlagDescriptor {
  flagId: number;
  flagName: string;
  sectionName: string | null;
  sectionPosition: number;
}
