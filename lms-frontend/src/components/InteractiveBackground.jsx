import { useEffect, useRef } from 'react';
import '../styles/interactive-background.css';

const InteractiveBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const shapesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Shape class
    class Shape {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 50 + 30;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = (Math.random() - 0.5) * 0.8;
        this.type = Math.floor(Math.random() * 4); // 0: circle, 1: square, 2: triangle, 3: hexagon
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.color = this.getRandomColor();
        this.opacity = Math.random() * 0.4 + 0.3; // Increased from 0.3 + 0.15 to 0.4 + 0.3
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.vx = this.speedX;
        this.vy = this.speedY;
      }

      getRandomColor() {
        const colors = [
          { r: 102, g: 126, b: 234 }, // Primary Purple #667eea
          { r: 118, g: 75, b: 162 },  // Dark Purple #764ba2
          { r: 139, g: 92, b: 246 },  // Violet #8b5cf6
          { r: 124, g: 58, b: 237 },  // Deep Purple #7c3aed
          { r: 147, g: 51, b: 234 },  // Purple #9333ea
          { r: 168, g: 85, b: 247 },  // Light Purple #a855f7
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }

      update(mouseX, mouseY, shapes) {
        // Mouse interaction
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 200;

        if (distance < maxDistance) {
          const force = (maxDistance - distance) / maxDistance;
          const angle = Math.atan2(dy, dx);
          this.vx -= Math.cos(angle) * force * 0.5;
          this.vy -= Math.sin(angle) * force * 0.5;
        }

        // Shape-to-shape collision detection and interaction
        shapes.forEach(other => {
          if (other === this) return;
          
          const dx = other.x - this.x;
          const dy = other.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (this.size + other.size) / 2;

          if (distance < minDistance) {
            // Collision detected - push shapes apart
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;
            
            // Move shapes apart
            const moveX = Math.cos(angle) * overlap * 0.5;
            const moveY = Math.sin(angle) * overlap * 0.5;
            
            this.x -= moveX;
            this.y -= moveY;
            other.x += moveX;
            other.y += moveY;

            // Bounce effect - exchange velocities
            const tempVx = this.vx;
            const tempVy = this.vy;
            this.vx = other.vx * 0.8;
            this.vy = other.vy * 0.8;
            other.vx = tempVx * 0.8;
            other.vy = tempVy * 0.8;
          }
        });

        // Apply velocity with damping
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        // Add base speed back
        this.vx += this.speedX * 0.1;
        this.vy += this.speedY * 0.1;

        // Update position
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.pulsePhase += this.pulseSpeed;

        // Bounce off edges
        if (this.x < this.size / 2) {
          this.x = this.size / 2;
          this.vx *= -0.8;
        }
        if (this.x > canvas.width - this.size / 2) {
          this.x = canvas.width - this.size / 2;
          this.vx *= -0.8;
        }
        if (this.y < this.size / 2) {
          this.y = this.size / 2;
          this.vy *= -0.8;
        }
        if (this.y > canvas.height - this.size / 2) {
          this.y = canvas.height - this.size / 2;
          this.vy *= -0.8;
        }
      }

      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Pulsing effect
        const pulse = Math.sin(this.pulsePhase) * 0.15 + 1;
        const currentSize = this.size * pulse;

        // Gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize);
        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`);
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);

        ctx.fillStyle = gradient;

        // Draw shape based on type
        ctx.beginPath();
        switch (this.type) {
          case 0: // Circle
            ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
            break;
          case 1: // Square
            ctx.rect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
            break;
          case 2: // Triangle
            ctx.moveTo(0, -currentSize / 2);
            ctx.lineTo(currentSize / 2, currentSize / 2);
            ctx.lineTo(-currentSize / 2, currentSize / 2);
            ctx.closePath();
            break;
          case 3: // Hexagon
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i;
              const x = Math.cos(angle) * currentSize / 2;
              const y = Math.sin(angle) * currentSize / 2;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        }

        ctx.fill();
        ctx.restore();
      }
    }

    // Initialize shapes
    const initShapes = () => {
      shapesRef.current = [];
      const shapeCount = Math.floor((canvas.width * canvas.height) / 12000); // Increased from 18000 to 12000
      for (let i = 0; i < shapeCount; i++) {
        shapesRef.current.push(new Shape());
      }
    };
    initShapes();

    // Mouse move handler
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between nearby shapes
      shapesRef.current.forEach((shape, i) => {
        shapesRef.current.slice(i + 1).forEach(otherShape => {
          const dx = shape.x - otherShape.x;
          const dy = shape.y - otherShape.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(102, 126, 234, ${(1 - distance / 150) * 0.25})`; // Increased from 0.15 to 0.25
            ctx.lineWidth = 1.5; // Increased from 1 to 1.5
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(otherShape.x, otherShape.y);
            ctx.stroke();
          }
        });
      });

      // Update and draw shapes
      shapesRef.current.forEach(shape => {
        shape.update(mouseRef.current.x, mouseRef.current.y, shapesRef.current);
        shape.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="interactive-background">
      <canvas ref={canvasRef} className="background-canvas" />
      <div className="background-overlay" />
    </div>
  );
};

export default InteractiveBackground;
