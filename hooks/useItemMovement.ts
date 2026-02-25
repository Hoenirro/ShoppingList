// hooks/useItemMovement.ts
import { useState, useCallback } from 'react';
import { Animated, LayoutAnimation } from 'react-native';

const ITEM_MOVE_ANIMATION = {
  duration: 300,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

export const useItemMovement = () => {
  const [movingItems, setMovingItems] = useState<{ [key: string]: Animated.Value }>({});

  const animateMovement = useCallback((key: string) => {
    const moveAnim = new Animated.Value(0);
    setMovingItems(prev => ({ ...prev, [key]: moveAnim }));

    return new Promise<void>((resolve) => {
      Animated.timing(moveAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        resolve();
        setTimeout(() => {
          setMovingItems(prev => {
            const newMoving = { ...prev };
            delete newMoving[key];
            return newMoving;
          });
        }, 100); 
      });
    });
  }, []);

  return { movingItems, animateMovement };
};