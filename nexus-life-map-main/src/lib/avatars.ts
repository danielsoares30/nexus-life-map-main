// Avatar image imports for character creation
import warriorMale from "@/assets/avatars/warrior-male.png";
import warriorFemale from "@/assets/avatars/warrior-female.png";
import mageMale from "@/assets/avatars/mage-male.png";
import ranger from "@/assets/avatars/ranger.png";
import monk from "@/assets/avatars/monk.png";
import alchemist from "@/assets/avatars/alchemist.png";
import druid from "@/assets/avatars/druid.png";
import bard from "@/assets/avatars/bard.png";
import assassin from "@/assets/avatars/assassin.png";
import necromancer from "@/assets/avatars/necromancer.png";
import paladin from "@/assets/avatars/paladin.png";

export interface AvatarOption {
  id: string;
  name: string;
  src: string;
  archetype?: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "warrior-male", name: "Guerreiro", src: warriorMale, archetype: "warrior" },
  { id: "warrior-female", name: "Valquíria", src: warriorFemale, archetype: "warrior" },
  { id: "mage-male", name: "Mago", src: mageMale, archetype: "mage" },
  { id: "paladin", name: "Paladino", src: paladin, archetype: "paladin" },
  { id: "ranger", name: "Ranger", src: ranger, archetype: "ranger" },
  { id: "monk", name: "Monge", src: monk, archetype: "monk" },
  { id: "alchemist", name: "Alquimista", src: alchemist, archetype: "alchemist" },
  { id: "druid", name: "Druida", src: druid, archetype: "druid" },
  { id: "bard", name: "Bardo", src: bard, archetype: "bard" },
  { id: "assassin", name: "Assassino", src: assassin, archetype: "assassin" },
  { id: "necromancer", name: "Necromante", src: necromancer, archetype: "necromancer" },
];
