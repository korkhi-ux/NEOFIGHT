
import { Fighter, GameState } from '../types';

export const drawFighter = (ctx: CanvasRenderingContext2D, f: Fighter, gameState: GameState) => {
    // Death Squash
    if (f.health <= 0 && f.id === 'enemy' && f.scaleY > 0) {
            f.scaleY *= 0.9;
            f.scaleX *= 1.1;
            f.color.glow = '#000';
    }

    // --- Kinetic Blur Trails (More discreet) ---
    if (f.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const last = f.trail[f.trail.length-1];
        ctx.moveTo(last.x + f.width/2, last.y + f.height/2);
        
        for(let i=f.trail.length-2; i>=0; i--) {
            const t = f.trail[i];
            ctx.lineTo(t.x + f.width/2, t.y + f.height/2);
        }
        ctx.lineTo(f.x + f.width/2, f.y + f.height/2);
        
        ctx.lineWidth = f.width * 0.6; 
        ctx.strokeStyle = f.color.glow;
        ctx.globalAlpha = 0.15; 
        ctx.stroke();
        ctx.restore();
    }

    // --- Character Body ---
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height);
    
    // Apply Tilt Rotation (Corrected: No longer multiplied by facing, so lean follows velocity direction)
    ctx.rotate(f.rotation); 
    
    ctx.scale(f.scaleX, f.scaleY);
    
    // Body Fill
    ctx.fillStyle = f.color.primary;
    // Flicker intensity based on frame
    const flicker = Math.abs(Math.sin(gameState.frameCount * 0.2)) * 10 + 20;
    ctx.shadowBlur = flicker;
    ctx.shadowColor = f.color.glow;

    const bodyW = f.width;
    const bodyH = f.height;

    ctx.beginPath();
    ctx.roundRect(-bodyW/2, -bodyH, bodyW, bodyH, 8); 
    ctx.fill();
    
    // Crisp Outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = f.color.glow;
    ctx.shadowBlur = 0; 
    ctx.stroke();
    
    // Eye
    if (f.hitFlashTimer <= 0) {
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        const eyeOffset = f.facing === 1 ? bodyW/4 : -bodyW/4 - 10;
        ctx.fillRect(eyeOffset, -bodyH + 20, 15, 4);
    }

    // --- KINETIC LIGHT BLADES (Attacks) ---
    if (f.isAttacking) {
        // Reset transform to center of mass before attack transforms
        ctx.translate(0, -bodyH/2); 

        // Directive 3: Lighter Composite for "Burning" effect
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 0; // Directive 3: No blur, sharp edges

        // Colors
        // We use the glow color but extremely transparent at the tip
        const bladeColor = f.color.glow; 
        
        // Random Jitter for "Nervous" energy (Directive 2)
        const jitter = Math.sin(gameState.frameCount * 0.8) * 0.05;

        // Configuration based on Combo Step
        let baseAngle = 0;
        let offsetX = 0;
        let offsetY = 0;
        let bladeLength = 180;
        let bladeThickness = 18;

        if (f.comboCount === 0) {
            // Step 1: Diagonal High Speed
            baseAngle = Math.PI / 4;
            offsetX = 20;
            bladeLength = 200;
            bladeThickness = 15;
        } else if (f.comboCount === 1) {
            // Step 2: Vertical Wide Slash
            baseAngle = -Math.PI / 6; 
            offsetX = 40;
            offsetY = 20;
            bladeLength = 240;
            bladeThickness = 25;
        } else {
            // Step 3: Horizontal Heavy Thrust
            baseAngle = 0;
            offsetX = 50;
            bladeLength = 350; // Huge reach
            bladeThickness = 40;
        }

        // Apply Player Facing Symmetry via Scale
        ctx.save();
        ctx.scale(f.facing, 1); // Flips the X axis if facing left
        
        // Move to Blade Origin (Relative to flipped axis)
        ctx.translate(bodyW/2 + offsetX, offsetY);
        
        // Rotate (Relative to flipped axis)
        ctx.rotate(baseAngle + jitter); 
        
        // --- Draw The Blade Bundle (Directive 2) ---

        // Helper to draw a single kinetic oval
        const drawKineticOval = (len: number, thick: number, alphaMult: number) => {
            ctx.beginPath();
            // Ellipse centered at len/2 to extend FROM the origin
            ctx.ellipse(len/2, 0, len/2, thick/2, 0, 0, Math.PI * 2);
            
            // Directive 1: Vivid Gradient (White -> Transparent Color)
            const grad = ctx.createLinearGradient(0, 0, len, 0);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Pure White Core
            grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(0.4, bladeColor); // Mid body is color
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade to nothing
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = alphaMult;
            ctx.fill();

            // Directive 3: Ultra-thin center wire
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len * 0.9, 0);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.stroke();
        };

        // 1. Main Blade
        drawKineticOval(bladeLength, bladeThickness, 0.9);

        // 2. Secondary Blade (Upper, Thinner, Angled up)
        ctx.save();
        ctx.rotate(-0.08); // -5 degrees approx
        drawKineticOval(bladeLength * 0.7, bladeThickness * 0.6, 0.6);
        ctx.restore();

        // 3. Tertiary Blade (Lower, Thinner, Angled down)
        ctx.save();
        ctx.rotate(0.08); // +5 degrees approx
        drawKineticOval(bladeLength * 0.6, bladeThickness * 0.5, 0.6);
        ctx.restore();

        ctx.restore(); // Restore facing flip

        // Restore standard composite for other elements
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();
};
