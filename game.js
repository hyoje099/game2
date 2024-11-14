const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tankSize = 40;
const bulletSpeed = 5;
const tankSpeed = 3;
const jumpHeight = 100; // 점프 높이
const jumpDuration = 300; // 점프 속도 조절
const maxHealth = 100;
const shieldDuration = 2000; // 방패 활성화 시간 (밀리초)
const maxBullets = 5; // 최대 발사 가능한 총알 수

// 발판 배열
const platforms = [
    { x: 150, y: 250, width: 100, height: 10 },
    { x: 500, y: 200, width: 120, height: 10 },
    { x: 300, y: 150, width: 100, height: 10 },
    { x: 100, y: 300, width: 150, height: 10 }, // 추가 발판 1
    { x: 400, y: 350, width: 150, height: 10 }, // 추가 발판 2
    { x: 600, y: 100, width: 150, height: 10 }  // 추가 발판 3
];

// 플레이어 탱크 생성
const player1 = {
    x: 100,
    y: canvas.height - tankSize,
    width: tankSize,
    height: tankSize,
    color: "green",
    health: maxHealth,
    bullets: [],
    isJumping: false,
    jumpStartY: 0,
    jumpProgress: 0,
    onPlatform: true, // 초기 상태는 발판 위
    shield: false,
    shieldEndTime: 0,
    controls: { left: 'a', right: 'd', fire: 'w', jump: 's', shield: 'q' }
};

const player2 = {
    x: canvas.width - 100 - tankSize,
    y: canvas.height - tankSize,
    width: tankSize,
    height: tankSize,
    color: "red",
    health: maxHealth,
    bullets: [],
    isJumping: false,
    jumpStartY: 0,
    jumpProgress: 0,
    onPlatform: true, // 초기 상태는 발판 위
    shield: false,
    shieldEndTime: 0,
    controls: { left: 'ArrowLeft', right: 'ArrowRight', fire: 'ArrowUp', jump: 'ArrowDown', shield: 'Shift' }
};

// 키 입력 추적
const keys = {};

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

function drawTank(tank) {
    // 체력 게이지바
    ctx.fillStyle = "gray";
    ctx.fillRect(tank.x, tank.y - 10, tank.width, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(tank.x, tank.y - 10, (tank.health / maxHealth) * tank.width, 5);
    
    // 방패 그리기
    if (tank.shield) {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 3;
        ctx.strokeRect(tank.x - 5, tank.y - 5, tank.width + 10, tank.height + 10);
    }
    
    // 탱크
    ctx.fillStyle = tank.color;
    ctx.fillRect(tank.x, tank.y, tank.width, tank.height);
}

function moveTank(tank) {
    // 좌우 이동
    if (keys[tank.controls.left] && tank.x > 0) {
        tank.x -= tankSpeed;
    }
    if (keys[tank.controls.right] && tank.x + tank.width < canvas.width) {
        tank.x += tankSpeed;
    }

    // 점프 시작
    if (keys[tank.controls.jump] && !tank.isJumping && tank.onPlatform) {
        tank.isJumping = true;
        tank.jumpStartY = tank.y;
        tank.jumpProgress = 0; // 점프 진행 상태 초기화
        tank.onPlatform = false; // 점프하면 발판에서 벗어나도록 설정
    }

    // 점프 및 낙하 처리
    if (tank.isJumping) {
        tank.jumpProgress += 16.67; // 프레임당 증가 (60 FPS 기준)
        const jumpRatio = Math.min(tank.jumpProgress / jumpDuration, 1);
        tank.y = tank.jumpStartY - (jumpHeight * (-4 * jumpRatio * jumpRatio + 4 * jumpRatio)); // 포물선 점프

        if (jumpRatio >= 1) {
            tank.isJumping = false; // 점프 완료
        }
    } else {
        // 중력 적용
        tank.y += 2; // 중력 효과
        if (tank.y + tank.height > canvas.height) {
            tank.y = canvas.height - tank.height; // 바닥에 착지
            tank.onPlatform = true;
        } else {
            // 발판과의 충돌 체크
            let onAnyPlatform = false;
            for (let platform of platforms) {
                if (tank.x < platform.x + platform.width &&
                    tank.x + tank.width > platform.x &&
                    tank.y + tank.height >= platform.y &&
                    tank.y + tank.height <= platform.y + platform.height) {
                    // 발판 위에 착지
                    tank.y = platform.y - tank.height; // 탱크의 y 위치를 발판 위로 조정
                    tank.isJumping = false; // 점프 상태 해제
                    onAnyPlatform = true;
                    break;
                }
            }
            tank.onPlatform = onAnyPlatform; // 발판 위에 있는지 상태 업데이트
        }
    }

    // 방패 활성화
    if (keys[tank.controls.shield] && !tank.shield && Date.now() > tank.shieldEndTime) {
        tank.shield = true;
        tank.shieldEndTime = Date.now() + shieldDuration;
    }
    if (tank.shield && Date.now() > tank.shieldEndTime) {
        tank.shield = false;
    }

    // 발사
    if (keys[tank.controls.fire] && tank.bullets.length < maxBullets) {
        fireBullet(tank);
    }
}

function fireBullet(tank) {
    if (tank.bullets.length < maxBullets) {
        const bullet = {
            x: tank.x + tank.width /2,
            y: tank.y,
            width: 5,
            height: 5,
            color: "black",
            direction: tank === player1 ? 1 : -1
        };
        tank.bullets.push(bullet);
    }
}

function updateBullets(tank, opponent) {
    for (let i = 0; i < tank.bullets.length; i++) {
        const bullet = tank.bullets[i];
        bullet.x += bulletSpeed * bullet.direction;

        // 총알끼리의 충돌 체크
        for (let j = 0; j < opponent.bullets.length; j++) {
            const opponentBullet = opponent.bullets[j];
            if (bullet.x < opponentBullet.x + opponentBullet.width &&
                bullet.x + bullet.width > opponentBullet.x &&
                bullet.y < opponentBullet.y + opponentBullet.height &&
                bullet.y + bullet.height > opponentBullet.y) {
                // 충돌 시 두 총알 제거
                tank.bullets.splice(i, 1);
                opponent.bullets.splice(j, 1);
                i--; // 인덱스 조정
                break;
            }
        }

        // 방패가 활성화된 상대방과의 충돌 체크
        if (opponent.shield && bullet.x < opponent.x + opponent.width &&
            bullet.x + bullet.width > opponent.x &&
            bullet.y < opponent.y + opponent.height &&
            bullet.y + bullet.height > opponent.y) {
            // 방패에 맞은 총알 제거
            tank.bullets.splice(i, 1);
            i--;
        }

        // 방패가 비활성화된 상대방과의 충돌 체크
        else if (!opponent.shield && bullet.x < opponent.x + opponent.width &&
            bullet.x + bullet.width > opponent.x &&
            bullet.y < opponent.y + opponent.height &&
            bullet.y + bullet.height > opponent.y) {
            opponent.health -= 10;
            tank.bullets.splice(i, 1);
            i--;
        }

        // 화면 밖으로 나가면 제거
        if (bullet.x < 0 || bullet.x > canvas.width) {
            tank.bullets.splice(i, 1);
            i--;
        }
    }
}

function drawBullet(bullet) {
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawPlatforms() {
    ctx.fillStyle = "brown";
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function checkGameOver() {
    if (player1.health <= 0) {
        alert("Player 2 Wins!");
        resetGame();
    } else if (player2.health <= 0) {
        alert("Player 1 Wins!");
        resetGame();
    }
}

function resetGame() {
    player1.health = maxHealth;
    player2.health = maxHealth;
    player1.bullets = [];
    player2.bullets = [];
    player1.x = 100;
    player2.x = canvas.width - 100 - tankSize;
    player1.shield = player2.shield = false; // 방패 상태 초기화
    player1.y = canvas.height - tankSize; // 위치 초기화
    player2.y = canvas.height - tankSize; // 위치 초기화
    player1.onPlatform = player2.onPlatform = true; // 발판 상태 초기화
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    moveTank(player1);
    moveTank(player2);

    updateBullets(player1, player2);
    updateBullets(player2, player1);

    drawPlatforms(); // 발판 그리기
    drawTank(player1);
    drawTank(player2);

    player1.bullets.forEach(drawBullet);
    player2.bullets.forEach(drawBullet);

    checkGameOver();

    requestAnimationFrame(gameLoop);
}

gameLoop();

