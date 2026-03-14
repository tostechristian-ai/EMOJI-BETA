/**
 * quadtree.js
 * Spatial partitioning data structure for efficient collision detection
 * Used to quickly retrieve nearby objects instead of checking all objects
 */

// ============================================
// QUADTREE CLASS
// ============================================

/**
 * Quadtree - Divides 2D space into 4 quadrants recursively
 * Used for spatial partitioning to optimize collision checks
 */
export class Quadtree {
  /**
   * Create a new Quadtree node
   * @param {Object} bounds - { x, y, width, height }
   * @param {number} maxObjects - Max objects before splitting (default: 10)
   * @param {number} maxLevels - Max tree depth (default: 4)
   * @param {number} level - Current depth level (default: 0)
   */
  constructor(bounds, maxObjects = 10, maxLevels = 4, level = 0) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = [];
  }

  /**
   * Clear all objects and child nodes
   */
  clear() {
    this.objects = [];

    // Recursively clear all child nodes
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].clear();
    }

    this.nodes = [];
  }

  /**
   * Split this node into 4 child quadrants
   * Layout:
   *   0 (top-right)    1 (top-left)
   *   3 (bot-right)    2 (bot-left)
   */
  split() {
    const nextLevel = this.level + 1;
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    // Top-right
    this.nodes[0] = new Quadtree(
      {
        x: x + subWidth,
        y: y,
        width: subWidth,
        height: subHeight,
      },
      this.maxObjects,
      this.maxLevels,
      nextLevel
    );

    // Top-left
    this.nodes[1] = new Quadtree(
      {
        x: x,
        y: y,
        width: subWidth,
        height: subHeight,
      },
      this.maxObjects,
      this.maxLevels,
      nextLevel
    );

    // Bottom-left
    this.nodes[2] = new Quadtree(
      {
        x: x,
        y: y + subHeight,
        width: subWidth,
        height: subHeight,
      },
      this.maxObjects,
      this.maxLevels,
      nextLevel
    );

    // Bottom-right
    this.nodes[3] = new Quadtree(
      {
        x: x + subWidth,
        y: y + subHeight,
        width: subWidth,
        height: subHeight,
      },
      this.maxObjects,
      this.maxLevels,
      nextLevel
    );
  }

  /**
   * Determine which quadrant an object belongs to
   * Returns index 0-3 for a valid quadrant, or -1 if it overlaps multiple
   * @param {Object} rect - { x, y, width, height }
   * @returns {number} Quadrant index or -1
   */
  getIndex(pRect) {
    let index = -1;

    // Calculate midpoints
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    // Check if object is entirely in top or bottom half
    const topQuadrant =
      pRect.y < horizontalMidpoint &&
      pRect.y + pRect.height < horizontalMidpoint;
    const bottomQuadrant = pRect.y > horizontalMidpoint;

    // Check if object is entirely in left or right half
    if (
      pRect.x < verticalMidpoint &&
      pRect.x + pRect.width < verticalMidpoint
    ) {
      // Left side
      if (topQuadrant) {
        index = 1; // Top-left
      } else if (bottomQuadrant) {
        index = 2; // Bottom-left
      }
    } else if (pRect.x > verticalMidpoint) {
      // Right side
      if (topQuadrant) {
        index = 0; // Top-right
      } else if (bottomQuadrant) {
        index = 3; // Bottom-right
      }
    }

    // -1 means object spans multiple quadrants
    return index;
  }

  /**
   * Insert an object into the quadtree
   * @param {Object} pRect - Object with { x, y, width, height, ref } properties
   *                         ref is the actual entity being stored
   */
  insert(pRect) {
    // If this node has children, try to insert into appropriate child
    if (this.nodes.length > 0) {
      const index = this.getIndex(pRect);

      if (index !== -1) {
        this.nodes[index].insert(pRect);
        return;
      }
    }

    // Add to this node's objects
    this.objects.push(pRect);

    // If we've exceeded max objects and haven't reached max depth, split
    if (
      this.objects.length > this.maxObjects &&
      this.level < this.maxLevels
    ) {
      // Split if not already split
      if (this.nodes.length === 0) {
        this.split();
      }

      // Move existing objects to appropriate children
      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i]);

        if (index !== -1) {
          // Object fits entirely in a child quadrant
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          // Object spans multiple quadrants, keep it here
          i++;
        }
      }
    }
  }

  /**
   * Retrieve all objects that could collide with the given rectangle
   * Returns objects in this node plus any in child nodes that overlap
   * @param {Object} pRect - { x, y, width, height }
   * @returns {Array} Array of stored objects
   */
  retrieve(pRect) {
    let returnObjects = this.objects.slice(); // Copy this node's objects

    // If we have child nodes, get objects from relevant children
    if (this.nodes.length > 0) {
      const index = this.getIndex(pRect);

      if (index !== -1) {
        // Object fits in a single quadrant, only check that child
        returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
      } else {
        // Object overlaps multiple quadrants, check all children
        for (let i = 0; i < this.nodes.length; i++) {
          returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
        }
      }
    }

    return returnObjects;
  }

  /**
   * Get debugging info about the tree structure
   * @returns {Object} Stats about the quadtree
   */
  getStats() {
    let totalObjects = this.objects.length;
    let totalNodes = 1;

    for (const node of this.nodes) {
      const stats = node.getStats();
      totalObjects += stats.totalObjects;
      totalNodes += stats.totalNodes;
    }

    return {
      level: this.level,
      objectsHere: this.objects.length,
      totalObjects,
      totalNodes,
      childCount: this.nodes.length,
    };
  }
}

// ============================================
// QUADTREE MANAGER
// ============================================

/**
 * Helper class to manage quadtree operations
 */
export class QuadtreeManager {
  /**
   * Create a new quadtree manager
   * @param {number} worldWidth
   * @param {number} worldHeight
   */
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: worldWidth,
      height: worldHeight,
    });
  }

  /**
   * Update the quadtree with current entities
   * Should be called once per frame before collision checks
   */
  update(enemies, destructibles, pickups, weapons, player) {
    this.quadtree.clear();

    // Insert enemies
    for (const enemy of enemies) {
      if (!enemy.isHit) {
        this.quadtree.insert({
          x: enemy.x - enemy.size / 2,
          y: enemy.y - enemy.size / 2,
          width: enemy.size,
          height: enemy.size,
          ref: enemy,
          type: 'enemy',
        });
      }
    }

    // Insert destructibles
    for (const destructible of destructibles) {
      this.quadtree.insert({
        x: destructible.x - destructible.size / 2,
        y: destructible.y - destructible.size / 2,
        width: destructible.size,
        height: destructible.size,
        ref: destructible,
        type: 'destructible',
      });
    }

    // Insert pickups
    for (const pickup of pickups) {
      this.quadtree.insert({
        x: pickup.x - pickup.size / 2,
        y: pickup.y - pickup.size / 2,
        width: pickup.size,
        height: pickup.size,
        ref: pickup,
        type: 'pickup',
      });
    }

    // Insert weapons
    for (const weapon of weapons) {
      if (weapon.active) {
        this.quadtree.insert({
          x: weapon.x - weapon.size / 2,
          y: weapon.y - weapon.size / 2,
          width: weapon.size,
          height: weapon.size,
          ref: weapon,
          type: 'weapon',
        });
      }
    }

    // Insert player
    this.quadtree.insert({
      x: player.x - player.size / 2,
      y: player.y - player.size / 2,
      width: player.size,
      height: player.size,
      ref: player,
      type: 'player',
    });
  }

  /**
   * Get nearby enemies for a position
   */
  getNearbyEnemies(x, y, radius) {
    const results = this.quadtree.retrieve({
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    });

    return results
      .filter(r => r.type === 'enemy')
      .map(r => r.ref);
  }

  /**
   * Get nearby pickups for a position
   */
  getNearbyPickups(x, y, radius) {
    const results = this.quadtree.retrieve({
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    });

    return results
      .filter(r => r.type === 'pickup')
      .map(r => r.ref);
  }

  /**
   * Get nearby weapons for a position
   */
  getNearbyWeapons(x, y, radius) {
    const results = this.quadtree.retrieve({
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    });

    return results
      .filter(r => r.type === 'weapon')
      .map(r => r.ref);
  }

  /**
   * Get all objects near a point
   */
  getNearby(x, y, radius) {
    return this.quadtree.retrieve({
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    });
  }

  /**
   * Check if a point is occupied by any entity
   */
  isOccupied(x, y, excludeType = null) {
    const nearby = this.getNearby(x, y, 20);

    return nearby.some(item => {
      if (excludeType && item.type === excludeType) return false;
      return true;
    });
  }

  /**
   * Find free spawn location near a position
   */
  findFreeSpawnLocation(x, y, radius = 50, attempts = 10) {
    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;

      const spawnX = x + Math.cos(angle) * distance;
      const spawnY = y + Math.sin(angle) * distance;

      if (!this.isOccupied(spawnX, spawnY)) {
        return { x: spawnX, y: spawnY };
      }
    }

    return { x, y }; // Fallback to original position
  }

  /**
   * Get debug stats about the tree
   */
  getStats() {
    return this.quadtree.getStats();
  }

  /**
   * Clear the quadtree
   */
  clear() {
    this.quadtree.clear();
  }

  /**
   * Reset to fresh state
   */
  reset() {
    this.quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: this.worldWidth,
      height: this.worldHeight,
    });
  }
}

// ============================================
// COLLISION DETECTION HELPERS
// ============================================

/**
 * Check if two circles overlap
 */
export function checkCircleCollision(circle1, circle2) {
  const dx = circle1.x - circle2.x;
  const dy = circle1.y - circle2.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = (circle1.size + circle2.size) / 2;

  return distance < minDistance;
}

/**
 * Check if a point is inside a circle
 */
export function isPointInCircle(pointX, pointY, circleX, circleY, radius) {
  const dx = pointX - circleX;
  const dy = pointY - circleY;
  const distance = Math.hypot(dx, dy);

  return distance < radius;
}

/**
 * Get distance between two points
 */
export function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

/**
 * Check if two rectangles overlap
 */
export function checkRectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Find the closest entity in a list
 */
export function findClosest(x, y, entities) {
  if (entities.length === 0) return null;

  let closest = entities[0];
  let minDistance = getDistance(x, y, closest.x, closest.y);

  for (let i = 1; i < entities.length; i++) {
    const distance = getDistance(x, y, entities[i].x, entities[i].y);
    if (distance < minDistance) {
      closest = entities[i];
      minDistance = distance;
    }
  }

  return closest;
}

/**
 * Sort entities by distance from a point
 */
export function sortByDistance(x, y, entities) {
  return entities
    .map(entity => ({
      entity,
      distance: getDistance(x, y, entity.x, entity.y),
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.entity);
}