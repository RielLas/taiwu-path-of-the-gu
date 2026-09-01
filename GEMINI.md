# Project Architectural Laws: 'Taiwu Path of the Gu'

This project merges the ruthless cultivation mechanics of *Reverend Insanity* with the systemic simulation depth of *The Scroll of Taiwu*. All code, features, and refactors MUST strictly obey these architectural laws.

---

### 1. Systemic Realism (Cultivation & Gu Ecology Engine)
* **Aperture & Essence Cap**:
  * `primeval_sea_volume` is strictly a percentage [0% - 100%].
  * Maximum capacity is permanently capped by `aptitude_percentage` (e.g., A-Grade = 93% max). It can never exceed this innate limit.
* **Exponential Purity Scaling**:
  * Essence multiplier formula across Ranks and Micro-stages:
    $$\text{Multiplier} = 80^{(\text{Rank} - 1)} \times 2^{\text{substage\_index}}$$
    *(Substages: Initial = 0, Middle = 1, Upper = 2, Peak = 3)*
  * Qualitative jumps across major Ranks must feel overwhelming; combat costs are measured in Base Essence Units (BEU) divided by this multiplier.
* **Essence Recovery Constraints**:
  * Essence never restores magically for free. It is only recovered via:
    1. **Meditation** (burns real-time Stamina/Action Points).
    2. **Primeval Stone consumption** (costly financial sacrifice).
    3. **Specific passive Gu worm abilities**.
* **Living Parasite Ecology**:
  * Gu worms are living entities possessing satiety/hunger meters.
  * Without regular sustenance, Gu worms starve, enter critical starvation, and perish permanently.

---

### 2. Macro-Structure (Time Currency & Autonomous Factions)
* **Time as Currency (Multiplayer Stamina Engine)**:
  * Every physical overworld action costs Stamina / Time Units (e.g., Tile movement = 2 Stamina, Washing aperture = 10 Stamina, Meditating = 20 Stamina).
  * Stamina regenerates passively over real-world clock time or via dedicated resting facilities.
* **Autonomous Institutional Hierarchy**:
  * Factions, clans, and sects maintain independent economies, territorial boundaries, and dynamic reputation ledgers.
  * Negative alignment/reputation triggers righteous enforcers, bounties, and hostile ambushes. Positive alignment unlocks clan trading and safe haven.
* **Pure Systemic Fidelity**:
  * Prioritize deep simulation matrices, mathematical rigor, and UI responsiveness over superficial narrative fluff.
