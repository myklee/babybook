export type FoodCategory =
  | 'western_traditional'
  | 'chinese'
  | 'japanese'
  | 'indian'
  | 'korean';

export interface SuggestedFood {
  name: string;
  category: FoodCategory;
  commonAge: string; // e.g., "4-6 months", "6+ months"
  description?: string;
}

export const suggestedFoods: Record<FoodCategory, SuggestedFood[]> = {
  western_traditional: [
    { name: 'Rice cereal (iron-fortified)', category: 'western_traditional', commonAge: '4-6 months', description: 'First solid food, mix with breast milk or formula' },
    { name: 'Oatmeal cereal', category: 'western_traditional', commonAge: '4-6 months', description: 'Single-grain, iron-fortified' },
    { name: 'Sweet potato (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Rich in beta-carotene and vitamins' },
    { name: 'Carrots (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Sweet and nutritious' },
    { name: 'Peas (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Good source of protein and fiber' },
    { name: 'Squash (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Butternut or acorn squash' },
    { name: 'Apples (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Cook and puree without skin' },
    { name: 'Pears (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Naturally sweet and easy to digest' },
    { name: 'Bananas (mashed)', category: 'western_traditional', commonAge: '4-6 months', description: 'No cooking required, rich in potassium' },
    { name: 'Peaches (pureed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Remove skin and pit' },
    { name: 'Avocado (mashed)', category: 'western_traditional', commonAge: '4-6 months', description: 'Healthy fats for brain development' },
    { name: 'Steamed broccoli', category: 'western_traditional', commonAge: '6+ months', description: 'Soft florets, finger food' },
    { name: 'Scrambled eggs', category: 'western_traditional', commonAge: '6+ months', description: 'Soft and protein-rich' },
    { name: 'Pureed chicken', category: 'western_traditional', commonAge: '6+ months', description: 'Lean protein source' },
    { name: 'Pureed turkey', category: 'western_traditional', commonAge: '6+ months', description: 'Alternative protein option' },
    { name: 'Tofu (soft)', category: 'western_traditional', commonAge: '6+ months', description: 'Plant-based protein' },
    { name: 'Beans (mashed)', category: 'western_traditional', commonAge: '6+ months', description: 'Black beans, kidney beans' },
    { name: 'Lentils (mashed)', category: 'western_traditional', commonAge: '6+ months', description: 'High in protein and iron' },
    { name: 'Pasta (soft)', category: 'western_traditional', commonAge: '8+ months', description: 'Well-cooked, small shapes' },
    { name: 'Cheerios', category: 'western_traditional', commonAge: '8+ months', description: 'Finger food for self-feeding' }
  ],
  chinese: [
    { name: 'Rice porridge (congee)', category: 'chinese', commonAge: '4-6 months', description: 'Traditional first food, easy to digest' },
    { name: 'Millet porridge', category: 'chinese', commonAge: '4-6 months', description: 'Easier to digest than rice' },
    { name: 'Steamed egg custard', category: 'chinese', commonAge: '6+ months', description: 'Silky smooth texture' },
    { name: 'Sweet potato (mashed)', category: 'chinese', commonAge: '4-6 months', description: 'Natural sweetness' },
    { name: 'Pumpkin (mashed)', category: 'chinese', commonAge: '4-6 months', description: 'Kabocha or sugar pumpkin' },
    { name: 'Bone broth', category: 'chinese', commonAge: '4-6 months', description: 'For nutrition and flavor' },
    { name: 'Soft tofu', category: 'chinese', commonAge: '6+ months', description: 'Silken tofu, mashed' },
    { name: 'Fish paste (white fish)', category: 'chinese', commonAge: '6+ months', description: 'Cod or other white fish' },
    { name: 'Vegetable congee', category: 'chinese', commonAge: '6+ months', description: 'Rice porridge with vegetables' },
    { name: 'Chicken congee', category: 'chinese', commonAge: '6+ months', description: 'Rice porridge with chicken' },
    { name: 'Steamed apple', category: 'chinese', commonAge: '4-6 months', description: 'Easier to digest when cooked' },
    { name: 'Yam (mashed)', category: 'chinese', commonAge: '4-6 months', description: 'Chinese yam, good for digestion' }
  ],
  japanese: [
    { name: 'Rice porridge (okayu)', category: 'japanese', commonAge: '4-6 months', description: '10:1 water to rice ratio initially' },
    { name: 'Tofu (mashed)', category: 'japanese', commonAge: '4-6 months', description: 'High protein, soft texture' },
    { name: 'Daikon radish (pureed)', category: 'japanese', commonAge: '4-6 months', description: 'Mild flavor, easy to digest' },
    { name: 'Kabocha squash (pureed)', category: 'japanese', commonAge: '4-6 months', description: 'Japanese pumpkin, naturally sweet' },
    { name: 'Fish paste (sea bream)', category: 'japanese', commonAge: '6+ months', description: 'Tai fish, traditional first protein' },
    { name: 'Seaweed broth (dashi)', category: 'japanese', commonAge: '4-6 months', description: 'For umami flavor' },
    { name: 'Carrot (pureed)', category: 'japanese', commonAge: '4-6 months', description: 'Sweet and nutritious' },
    { name: 'Spinach (pureed)', category: 'japanese', commonAge: '5-6 months', description: 'Blanched and pureed' },
    { name: 'Chicken (minced)', category: 'japanese', commonAge: '6+ months', description: 'Finely minced and cooked' },
    { name: 'Noodles (udon)', category: 'japanese', commonAge: '8+ months', description: 'Soft, well-cooked' },
    { name: 'Banana (mashed)', category: 'japanese', commonAge: '4-6 months', description: 'No cooking required' },
    { name: 'Apple (grated)', category: 'japanese', commonAge: '4-6 months', description: 'Finely grated raw apple' }
  ],
  indian: [
    { name: 'Rice water', category: 'indian', commonAge: '4-6 months', description: 'First liquid food, easy to digest' },
    { name: 'Rice with dal (mashed)', category: 'indian', commonAge: '4-6 months', description: 'Lentils provide protein' },
    { name: 'Ragi porridge', category: 'indian', commonAge: '4-6 months', description: 'Finger millet, very nutritious' },
    { name: 'Banana with ghee', category: 'indian', commonAge: '4-6 months', description: 'Mashed banana with clarified butter' },
    { name: 'Khichdi', category: 'indian', commonAge: '6+ months', description: 'Rice and lentil mixture' },
    { name: 'Sweet potato (mashed)', category: 'indian', commonAge: '4-6 months', description: 'Shakarkandi, naturally sweet' },
    { name: 'Moong dal (mashed)', category: 'indian', commonAge: '4-6 months', description: 'Yellow split lentils' },
    { name: 'Suji porridge', category: 'indian', commonAge: '6+ months', description: 'Semolina porridge' },
    { name: 'Carrot (mashed)', category: 'indian', commonAge: '4-6 months', description: 'Gajar, steamed and mashed' },
    { name: 'Apple (steamed)', category: 'indian', commonAge: '4-6 months', description: 'Easier to digest when cooked' },
    { name: 'Pear (mashed)', category: 'indian', commonAge: '4-6 months', description: 'Nashpati, sweet and soft' },
    { name: 'Idli (soft)', category: 'indian', commonAge: '8+ months', description: 'Steamed rice cakes' },
    { name: 'Chiku (mashed)', category: 'indian', commonAge: '6+ months', description: 'Sapodilla fruit' }
  ],
  korean: [
    { name: 'Rice porridge (juk)', category: 'korean', commonAge: '4-6 months', description: 'Often with vegetables' },
    { name: 'Miyeok-guk (seaweed soup)', category: 'korean', commonAge: '4-6 months', description: 'Nutritious seaweed broth' },
    { name: 'Sweet potato (mashed)', category: 'korean', commonAge: '4-6 months', description: 'Goguma, naturally sweet' },
    { name: 'Soft tofu', category: 'korean', commonAge: '4-6 months', description: 'Dubu, high in protein' },
    { name: 'Vegetable rice porridge', category: 'korean', commonAge: '5-6 months', description: 'Juk with various vegetables' },
    { name: 'Pumpkin (mashed)', category: 'korean', commonAge: '4-6 months', description: 'Hobak, easy to digest' },
    { name: 'Carrot (pureed)', category: 'korean', commonAge: '4-6 months', description: 'Danggeun, sweet and nutritious' },
    { name: 'Spinach (pureed)', category: 'korean', commonAge: '5-6 months', description: 'Sigeumchi, blanched and pureed' },
    { name: 'Chicken juk', category: 'korean', commonAge: '6+ months', description: 'Rice porridge with chicken' },
    { name: 'Fish porridge', category: 'korean', commonAge: '6+ months', description: 'White fish in rice porridge' },
    { name: 'Pear (grated)', category: 'korean', commonAge: '4-6 months', description: 'Bae, naturally sweet' },
    { name: 'Banana (mashed)', category: 'korean', commonAge: '4-6 months', description: 'No cooking required' }
  ]
};

export const categoryNames: Record<FoodCategory, string> = {
  western_traditional: 'Western Traditional',
  chinese: 'Chinese',
  japanese: 'Japanese',
  indian: 'Indian',
  korean: 'Korean'
};

export const getAllSuggestedFoods = (): SuggestedFood[] => {
  return Object.values(suggestedFoods).flat();
};

export const searchSuggestedFoods = (query: string): SuggestedFood[] => {
  const lowercaseQuery = query.toLowerCase();
  return getAllSuggestedFoods().filter(food =>
    food.name.toLowerCase().includes(lowercaseQuery) ||
    food.description?.toLowerCase().includes(lowercaseQuery)
  );
};

export const getFoodsByCategory = (category: FoodCategory): SuggestedFood[] => {
  return suggestedFoods[category] || [];
};
