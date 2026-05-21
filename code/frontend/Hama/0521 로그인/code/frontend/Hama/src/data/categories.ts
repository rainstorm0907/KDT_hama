import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  Bike,
  Camera,
  Footprints,
  Gamepad2,
  Laptop,
  Monitor,
  Music,
  Package,
  Shirt,
  Smartphone,
  Tent,
} from 'lucide-react';

export type Category = {
  id: string;
  name: string;
  icon: LucideIcon;
};

export const categories: Category[] = [
  { id: 'pc', name: '컴퓨터', icon: Monitor },
  { id: 'laptop', name: '노트북', icon: Laptop },
  { id: 'phone', name: '핸드폰', icon: Smartphone },
  { id: 'bike', name: '자전거', icon: Bike },
  { id: 'cloth', name: '의류', icon: Shirt },
  { id: 'shoes', name: '신발', icon: Footprints },
  { id: 'goods', name: '굿즈', icon: Package },
  { id: 'camera', name: '카메라', icon: Camera },
  { id: 'game', name: '게임기', icon: Gamepad2 },
  { id: 'furniture', name: '가구', icon: Armchair },
  { id: 'music', name: '악기', icon: Music },
  { id: 'camping', name: '캠핑', icon: Tent },
];

