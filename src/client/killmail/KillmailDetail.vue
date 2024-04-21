<!--

A standalone page for displaying a single killmail

-->

<template>
  <app-page :identity="identity" :content-width="1100">
    <loading-spinner
      v-if="promise"
      :promise="promise"
      display="block"
      size="34px"
      class="loading-spinner"
    />
    <div v-if="payload" class="_killmail-detail">
      <div class="combat-cnt">
        <!-- The victim's character card -->
        <div class="victim">
          <eve-image
            :id="victim.character?.id"
            type="character"
            :size="105"
            :title="nameOrUnknown(victim.character?.id)"
            :href="zkbLink(victim.character)"
            class="victim-icon hover-icon"
          />
          <div class="victim-affiliation-icons">
            <eve-image
              :id="victim.corporation?.id"
              type="corporation"
              :size="50"
              :title="nameOrUnknown(victim.corporation?.id)"
              :href="zkbLink(victim.corporation)"
              class="victim-corporation-icon hover-icon"
            />
            <eve-image
              v-if="victim.alliance"
              :id="victim.alliance.id"
              type="alliance"
              :size="50"
              :title="name(victim.alliance.id)"
              :href="zkbLink(victim.alliance)"
              class="victim-alliance-icon hover-icon"
            />
            <div v-else class="victim-alliance-icon-standin hover-icon"></div>
          </div>
          <div class="victim-info">
            <div class="victim-name">
              <a
                class="hover-link"
                :href="zkbLink(victim.character)"
                target="_blank"
              >
                {{ nameOrUnknown(victim.character?.id) }}
              </a>
            </div>
            <div class="victim-corp">
              <a
                class="hover-link"
                :href="zkbLink(victim.corporation)"
                target="_blank"
              >
                {{ nameOrUnknown(victim.corporation?.id) }}
              </a>
            </div>
            <div v-if="victim.alliance" class="victim-alliance">
              <a
                class="hover-link"
                :href="zkbLink(victim.alliance)"
                target="_blank"
              >
                {{ name(victim.alliance.id) }}
              </a>
            </div>
          </div>
        </div>

        <!-- Combat summary card (time, location, total value, etc.) -->
        <div class="csum">
          <div v-for="(row, i) in infoTable" :key="i" class="csum-row">
            <div class="csum-label">{{ row.label }}</div>
            <div class="csum-value">{{ row.content }}</div>
          </div>
        </div>

        <!-- Attacking teams -->
        <div v-if="displayedTeams.length" class="teams">
          <div class="attackers-header">
            Teams ({{ maxDisplayedTeams.length }})
          </div>
          <div
            v-for="team in displayedTeams"
            :key="team.entity.id"
            class="team"
          >
            <eve-image
              :id="team.entity.id"
              :type="team.entity.imageType"
              :size="60"
              :href="zkbLink(team.entity)"
              :title="name(team.entity.id)"
              class="team-icon hover-icon"
            />
            <div class="team-info">
              <div class="team-name">
                <a :href="zkbLink(team.entity)" class="hover-link">
                  {{ name(team.entity.id) }}
                </a>
              </div>
              <div class="team-count">{{ team.count }} participants</div>
            </div>
          </div>
          <div v-if="hiddenTeamsCount > 0" class="attckers-btn-cnt">
            <button class="attackers-btn" @click="showAllTeams = !showAllTeams">
              <template v-if="!showAllTeams">
                <span class="material-symbols-sharp expand-icon">
                  expand_more
                </span>
                {{ hiddenTeamsCount }} more teams
              </template>
              <template v-else>
                <span class="material-symbols-sharp expand-icon">
                  expand_less
                </span>
                Collapse
              </template>
            </button>
          </div>
        </div>

        <!-- Attacking participants -->
        <div class="attackers">
          <div class="attackers-header">
            Participants ({{ killmail.attackers.length }})
          </div>
          <div>
            <div
              v-for="attacker in displayedAttackers"
              :key="attacker.actor?.id"
              class="attacker"
            >
              <eve-image
                :id="attacker.actor?.id"
                :type="attacker.actor?.imageType"
                :size="60"
                :title="nameOrUnknown(attacker.actor?.id)"
                :href="zkbLink(attacker.actor)"
                class="attacker-icon hover-icon"
              />
              <eve-image
                :id="attacker.affiliation?.id"
                :type="attacker.affiliation?.imageType"
                :size="60"
                :title="nameOrUnknown(attacker.affiliation?.id)"
                :href="zkbLink(attacker.affiliation)"
                class="attacker-corp-icon hover-icon"
              />
              <div class="attacker-ship">
                <eve-image
                  :id="attacker.ship?.id"
                  :type="attacker.ship?.imageType"
                  :size="30"
                  :title="nameOrUnknown(attacker.ship?.id)"
                  class="attacker-ship-icon"
                />
                <eve-image
                  :id="attacker.weapon?.id"
                  :type="attacker.weapon?.imageType"
                  :size="30"
                  :title="nameOrUnknown(attacker.weapon?.id)"
                  class="attacker-weapon-icon"
                />
              </div>
              <div class="attacker-info">
                <div class="attacker-name">
                  <a
                    class="hover-link"
                    :href="zkbLink(attacker.actor)"
                    target="_blank"
                  >
                    {{ nameOrUnknown(attacker.actor?.id) }}
                  </a>
                </div>
                <div class="attacker-corp">
                  <a
                    class="hover-link"
                    :href="zkbLink(attacker.affiliation)"
                    target="_blank"
                  >
                    {{ nameOrUnknown(attacker.affiliation?.id) }}
                  </a>
                </div>
              </div>
              <span
                v-if="attacker.finalBlow"
                class="material-symbols-sharp final-blow-icon"
                title="Final blow"
              >
                explosion
              </span>
              <div class="attacker-damage">
                <div>{{ formatDamage(attacker.damageDone) }}</div>
                <div class="attacker-damage-perc">
                  {{ (attacker.damageDone / totalDamage).toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>
          <div v-if="killmail.attackers.length > 10" class="attckers-btn-cnt">
            <button
              class="attackers-btn"
              @click="showAllAttackers = !showAllAttackers"
            >
              <template v-if="!showAllAttackers">
                <span class="material-symbols-sharp expand-icon">
                  expand_more
                </span>
                {{ killmail.attackers.length - displayedAttackers.length }} more
                participants
              </template>
              <template v-else>
                <span class="material-symbols-sharp expand-icon">
                  expand_less
                </span>
                Collapse
              </template>
            </button>
          </div>
        </div>
      </div>

      <div class="ship-cnt">
        <!-- Fitting ring -->
        <div class="fitting-cnt">
          <killmail-fitting :fitting="fitting" class="fitting" />
          <div class="fitting-tr">
            <div>
              <a
                class="meta-link hover-link"
                :href="`//zkillboard.com/kill/${killmailId}`"
                target="_blank"
                >zKillboard &#x2197;</a
              >
            </div>
            <div>
              <a
                class="meta-link hover-link"
                :href="`//esi.evetech.net/latest/killmails/${killmailId}/${payload.meta.hash}/`"
                target="_blank"
                >ESI &#x2197;</a
              >
            </div>
          </div>
        </div>

        <!-- Item manifest -->
        <div v-for="section in manifest" :key="section.name">
          <div class="section-header">{{ section.label }}</div>
          <div>
            <div
              v-for="item in section.items"
              :key="`${item.typeId}-${item.status}`"
              class="item-row"
              :class="{
                destroyed: item.status == `destroyed`,
              }"
            >
              <eve-image
                :id="item.typeId"
                class="item-icon"
                type="type"
                :size="30"
                :title="name(item.typeId)"
              />
              <div class="item-name">{{ name(item.typeId) }}</div>
              <div class="item-count">{{ item.count }}</div>
              <div class="item-value">{{ itemPrice(item) }}</div>
            </div>
          </div>
        </div>

        <div class="section-header">Summary</div>
        <div>
          <div class="item-row vsum-row">
            <div class="vsum-label">Dropped</div>
            <div class="vsum-value">
              {{ formatPrice(valueSummary.dropped) }}
            </div>
          </div>
          <div class="item-row vsum-row destroyed">
            <div class="vsum-label">Destroyed</div>
            <div class="vsum-value">
              {{ formatPrice(valueSummary.destroyed) }}
            </div>
          </div>
          <div class="item-row vsum-row">
            <div class="vsum-label">Total</div>
            <div class="vsum-value">{{ formatPrice(valueSummary.total) }}</div>
          </div>
        </div>
      </div>
    </div>
  </app-page>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import moment from "moment";

import AppPage from "../shared/AppPage.vue";
import EveImage from "../shared/EveImage.vue";
import KillmailFitting from "./KillmailFitting.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import ajaxer from "../shared/ajaxer";
import { Identity } from "../home";
import { NameCacheMixin } from "../shared/nameCache";
import { Killmail_$Id_GET } from "../../shared/route/api/killmail/type_killmail_$id_GET";
import { KmFitting, KmItem } from "../../shared/types/killmail/KmFitting";
import { EsiKillmail } from "../../shared/types/esi/EsiKillmail";
import { SimpleMap } from "../../shared/util/simpleTypes";
import { AssetType } from "../shared/types";
import { getWithDefault } from "../../shared/util/collections";

export default defineComponent({
  components: {
    AppPage,
    EveImage,
    KillmailFitting,
    LoadingSpinner,
  },

  mixins: [NameCacheMixin],

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
    killmailId: { type: Number, required: true },
  },

  data() {
    return {
      promise: null as Promise<unknown> | null,
      payload: null as Killmail_$Id_GET | null,
      showAllTeams: false,
      showAllAttackers: false,
    };
  },

  computed: {
    killmail(): EsiKillmail {
      if (this.payload == null) {
        throw new Error(`No payload yet`);
      }
      return this.payload.killmail;
    },

    fitting(): KmFitting {
      if (this.payload == null) {
        throw new Error(`No payload yet`);
      }
      return this.payload.fitting;
    },

    prices(): SimpleMap<number> {
      if (this.payload == null) {
        throw new Error(`No payload yet`);
      }
      return this.payload.prices;
    },

    manifest(): ManifestSection[] {
      return this.processedFitting.manifest;
    },

    valueSummary(): ValueSummary {
      return this.processedFitting.valueSummary;
    },

    victim() {
      return {
        character: entity(this.killmail.victim.character_id, "character"),
        corporation: entity(this.killmail.victim.corporation_id, "corporation"),
        alliance: entity(this.killmail.victim.alliance_id, "alliance"),
      };
    },

    infoTable() {
      return [
        {
          label: "Ship",
          content: this.name(this.killmail.victim.ship_type_id),
        },
        { label: "System", content: this.name(this.killmail.solar_system_id) },
        {
          label: "Time",
          content: moment(this.killmail.killmail_time).format("lll"),
        },
        {
          label: "Damage",
          content: `${this.formatDamage(this.totalDamage)}`,
        },
        {
          label: "Dropped",
          content: `${this.formatPrice(this.valueSummary.dropped)} ISK`,
        },
        {
          label: "Destroyed",
          content: `${this.formatPrice(this.valueSummary.destroyed)} ISK`,
        },
        {
          label: "Ship + fit",
          content: `${this.formatPrice(this.valueSummary.fitting + this.valueSummary.ship)} ISK`,
        },
        {
          label: "Total value",
          content: `${this.formatPrice(this.valueSummary.total)} ISK`,
        },
      ];
    },

    totalDamage(): number {
      let totalDamage = 0;
      for (const attacker of this.killmail.attackers) {
        totalDamage += attacker.damage_done;
      }
      return totalDamage;
    },

    processedFitting(): {
      manifest: ManifestSection[];
      valueSummary: ValueSummary;
    } {
      const manifest: ManifestSection[] = [];
      const valueSummary = {
        total: 0,
        ship: 0,
        fitting: 0,
        dropped: 0,
        destroyed: 0,
      };

      manifest.push({
        name: "ship",
        label: "Ship",
        items: [
          {
            typeId: this.killmail.victim.ship_type_id,
            count: 1,
            status: "destroyed",
          },
        ],
      });
      const shipValue = this.prices[this.killmail.victim.ship_type_id] ?? 0;
      valueSummary.total += shipValue;
      valueSummary.ship = shipValue;
      valueSummary.destroyed += shipValue;

      for (const section of this.fitting.sections) {
        const items: KmItem[] = [];

        if (section.type == "slots") {
          for (const item of section.slots) {
            if (item == null) {
              continue;
            }
            if (item.module) {
              items.push(item.module);
              this.addValue(valueSummary, item.module, "fitting");
            }
            if (item.charge) {
              items.push(item.charge);
              this.addValue(valueSummary, item.charge, "fitting");
            }
          }
        } else {
          for (const item of section.hold) {
            items.push(item);
            this.addValue(valueSummary, item, "cargo");
          }
        }

        if (items.length == 0) {
          continue;
        }

        manifest.push({
          name: section.name,
          label: section.label,
          items,
        });
      }

      return { manifest, valueSummary };
    },

    processedAttackers(): {
      teams: ProcessedTeam[];
      individuals: ProcessedAttacker[];
    } {
      const teamMap = new Map<number, ProcessedTeam>();
      const attackers: ProcessedAttacker[] = [];

      for (const attacker of this.killmail.attackers) {
        const character = entity(attacker.character_id, "character");
        const corporation = entity(attacker.corporation_id, "corporation");
        const alliance = entity(attacker.alliance_id, "alliance");
        const faction = entity(attacker.faction_id, "corporation", "faction");
        const ship = entity(attacker.ship_type_id, "type", "ship");
        const weapon = entity(attacker.weapon_type_id, "type");

        const affiliation = alliance ?? corporation ?? faction;

        attackers.push({
          actor: character ?? ship ?? corporation ?? faction,
          affiliation,
          ship: ship,
          weapon: weapon ?? ship,
          damageDone: attacker.damage_done,
          finalBlow: attacker.final_blow,
        });

        if (affiliation) {
          getWithDefault(teamMap, affiliation.id, () => {
            return {
              entity: affiliation,
              count: 0,
            };
          }).count++;
        }
      }

      return {
        teams: Array.from(teamMap.values()).sort((a, b) => b.count - a.count),
        individuals: attackers,
      };
    },

    displayedAttackers(): ProcessedAttacker[] {
      if (this.showAllAttackers) {
        return this.processedAttackers.individuals;
      } else {
        return this.processedAttackers.individuals.slice(0, 10);
      }
    },

    maxDisplayedTeams(): ProcessedTeam[] {
      if (
        this.processedAttackers.individuals.length <= 10 ||
        (this.processedAttackers.teams[0]?.count ?? 0) <= 2
      ) {
        return [];
      } else {
        return this.processedAttackers.teams;
      }
    },

    minDisplayedTeams(): ProcessedTeam[] {
      const attackerCount = this.processedAttackers.individuals.length;
      return this.maxDisplayedTeams.filter((team) => {
        return team.count >= Math.sqrt(attackerCount);
      });
    },

    displayedTeams(): ProcessedTeam[] {
      return this.showAllTeams
        ? this.maxDisplayedTeams
        : this.minDisplayedTeams;
    },

    hiddenTeamsCount(): number {
      return this.maxDisplayedTeams.length - this.minDisplayedTeams.length;
    },

    displayDate(): string {
      return moment(this.killmail.killmail_time).format();
    },
  },

  async mounted() {
    const promise = ajaxer.getKillmail(this.killmailId);
    this.promise = promise;

    const response = await promise;

    this.promise = null;
    this.addNames(response.data.names);
    this.payload = response.data;
  },

  methods: {
    itemPrice(item: KmItem) {
      const value = item.count * (this.payload?.prices[item.typeId] ?? 0);
      return PRICE_FORMAT.format(value);
    },

    formatPrice(value: number) {
      return PRICE_FORMAT.format(value);
    },

    formatDamage(value: number) {
      return DAMAGE_FORMAT.format(value);
    },

    addValue(summary: ValueSummary, item: KmItem, type: "fitting" | "cargo") {
      const value = item.count * (this.payload?.prices[item.typeId] ?? 0);
      summary.total += value;
      if (type == "fitting") {
        summary.fitting += value;
      }
      if (item.status == "destroyed") {
        summary.destroyed += value;
      } else {
        summary.dropped += value;
      }
    },

    zkbLink(entity: Entity | undefined) {
      return entity
        ? `//zkillboard.com/${entity.zkbType}/${entity.id}`
        : undefined;
    },
  },
});

function entity(id: number, imageType: AssetType, zkbType?: string): Entity;
function entity(
  id: undefined,
  imageType: AssetType,
  zkbType?: string,
): undefined;
function entity(
  id: number | undefined,
  imageType: AssetType,
  zkbType?: string,
): Entity | undefined;
function entity(
  id: number | undefined,
  imageType: AssetType,
  zkbType: string = imageType,
): Entity | undefined {
  if (id == undefined) {
    return id;
  } else {
    return {
      id,
      imageType,
      zkbType,
    };
  }
}

const PRICE_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const DAMAGE_FORMAT = new Intl.NumberFormat();

interface ManifestSection {
  name: string;
  label: string;
  items: KmItem[];
}

interface ValueSummary {
  total: number;
  ship: number;
  fitting: number;
  destroyed: number;
  dropped: number;
}

interface ProcessedAttacker {
  actor: Entity | undefined;
  affiliation: Entity | undefined;
  ship: Entity | undefined;
  weapon: Entity | undefined;
  damageDone: number;
  finalBlow: boolean;
}

interface ProcessedTeam {
  entity: Entity;
  count: number;
}

interface Entity {
  id: number;
  imageType: AssetType;
  zkbType: string;
}
</script>

<style scoped>
._killmail-detail {
  display: flex;
  font-size: 14px;
  color: #cdcdcd;
  padding-top: 25px;
  padding-bottom: 100px;
}

.hover-link {
  color: inherit;
}

.hover-link:hover {
  text-decoration: underline;
}

.hover-icon:hover {
  outline: 1px solid #333;
}

.loading-spinner {
  margin-top: 25px;
}

.combat-cnt {
  width: 390px;
}

.victim {
  display: flex;
  background: #191919;
}

.victim-affiliation-icons {
  display: flex;
  flex-direction: column;
  margin-left: 5px;
}

.victim-corporation-icon,
.victim-alliance-icon {
  background-color: #111;
}

.victim-corporation-icon {
  margin-bottom: 5px;
}

.victim-alliance-icon-standin {
  width: 50px;
  height: 50px;
  box-sizing: border-box;
  background-color: #111;
}

.victim-info {
  flex: 1;
  margin-top: 15px;
  margin-left: 15px;
}

.victim-name {
  font-size: 16px;
}

.victim-corp,
.victim-alliance {
  color: #a7a29c;
  margin-top: 5px;
}

.csum {
  background-color: #191919;
  padding: 6px 10px;
  margin-top: 10px;
}

.csum-row {
  display: flex;
  padding: 4px 0;
}

.csum-label {
  width: 100px;
  color: #a7a29c;
}

.attackers-header {
  margin-top: 30px;
  margin-bottom: 10px;
  padding-left: 10px;
}

.team-icon {
  background: #111;
}

.attacker,
.team {
  display: flex;
  padding: 10px;
  align-items: center;
  background: #191919;
}

.attacker + .attacker,
.team + .team {
  border-top: 1px solid #272727;
}

.attacker-corp-icon {
  background: #111;
  margin-left: 5px;
}

.attacker-ship {
  display: flex;
  flex-direction: column;
  margin-left: 5px;
}

.attacker-weapon-icon {
  background-color: #111;
}

.attacker-info,
.team-info {
  flex: 1;
  margin-left: 10px;
}

.attacker-corp,
.team-count {
  color: #a7a29c;
  margin-top: 5px;
}

.final-blow-icon {
  margin-left: 5px;
  margin-right: 10px;
  cursor: default;
}

.attacker-damage {
  text-align: right;
  padding-right: 5px;
}

.attacker-damage-perc {
  color: #a7a29c;
  margin-top: 5px;
}

.attckers-btn-cnt {
  display: flex;
  justify-content: center;
}

.attackers-btn {
  padding: 10px;
  display: flex;
  align-items: center;

  font-size: 14px;
  font-family: Arial, Helvetica, sans-serif;
  width: 100%;
  box-sizing: border-box;
  background-color: #191919;
  border: none;
  border-top: 1px solid #272727;
  text-align: left;
  color: #cdcdcd;
  outline: none;
}

.attackers-btn:hover {
  background-color: #232323;
}

.attackers-btn:active {
  background-color: #272727;
}

.expand-icon {
  margin-right: 2px;
}

.ship-cnt {
  flex: 1;
  max-width: 600px;
  margin-left: 50px;
}

.fitting-cnt {
  display: flex;
  justify-content: center;
  position: relative;
}

.fitting {
  width: 550px;
}

.fitting-tr {
  position: absolute;
  width: 225px;
  right: 0;
  top: 0;
  text-align: right;
}

.meta-link {
  color: #a7a29c;
}

.section-header {
  margin-top: 20px;
  margin-bottom: 8px;
}

.item-row {
  padding: 4px 10px 4px 20px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #272727;
  background: #1a1a1a;
}

.item-row:first-child {
  border-top: 1px solid #272727;
}

.item-row.destroyed {
  background-color: #341414;
}

.item-icon {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #222;
}

.item-name {
  flex: 1;
  padding-left: 20px;
}

.item-count {
  text-align: right;
}

.item-value {
  text-align: right;
  width: 170px;
}

.vsum-row {
  height: 40px;
}

.vsum-value {
  flex: 1;
  text-align: right;
}
</style>
