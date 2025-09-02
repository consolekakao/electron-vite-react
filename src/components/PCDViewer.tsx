import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { pako } from 'pako';
import {
  Box,
  Paper,
  Typography,
  Button,
  Slider,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  CloudUpload,
  Visibility,
} from '@mui/icons-material';

interface PCDPoint {
  x: number;
  y: number;
  z: number;
  color?: THREE.Color;
}

interface PCDViewerProps {
  width?: number;
  height?: number;
}

interface TooltipData {
  x: number;
  y: number;
  point: PCDPoint;
}

// OrbitControls 타입 정의 (Three.js examples의 OrbitControls)
declare class OrbitControls {
  constructor(camera: THREE.Camera, domElement: HTMLElement);
  enableDamping: boolean;
  dampingFactor: number;
  screenSpacePanning: boolean;
  minDistance: number;
  maxDistance: number;
  target: THREE.Vector3;
  update(): void;
  dispose(): void;
}

const PCDViewer: React.FC<PCDViewerProps> = ({ width = 800, height = 600 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointCloudRef = useRef<THREE.Points | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const originalPointsRef = useRef<PCDPoint[]>([]);
  const animationIdRef = useRef<number | null>(null);
  
  const [pointSize, setPointSize] = useState(2);
  const [pointColor, setPointColor] = useState('#ffffff');
  const [pointCount, setPointCount] = useState(0);
  const [fileName, setFileName] = useState('None');
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Three.js 초기화
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene 생성
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera 생성
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Renderer 생성
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x222222);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Controls 생성 (동적으로 import)
    const loadControls = async () => {
      try {
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls');
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 1000;
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;
      } catch (error) {
        console.error('Failed to load OrbitControls:', error);
      }
    };
    
    loadControls();

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Raycaster 초기화
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Mouse Vector 초기화
    const mouse = new THREE.Vector2();
    mouseRef.current = mouse;

    // 마우스 이벤트 리스너
    const handleMouseMove = (event: MouseEvent) => {
      if (!renderer.domElement || !raycaster || !mouse) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (pointCloudRef.current && cameraRef.current) {
        raycaster.setFromCamera(mouse, cameraRef.current);
        raycaster.params.Points!.threshold = Math.max(0.1, pointSize * 0.1);
        
        const intersects = raycaster.intersectObject(pointCloudRef.current);
        
        if (intersects.length > 0) {
          const intersect = intersects[0];
          const index = intersect.index!;
          const point = originalPointsRef.current[index];
          
          if (point) {
            setTooltip({
              x: event.clientX,
              y: event.clientY,
              point
            });
          }
        } else {
          setTooltip(null);
        }
      }
    };

    const handleMouseLeave = () => {
      setTooltip(null);
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);

    // 애니메이션 루프
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // 정리 함수
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, [width, height, pointSize]);

  // PCD 파일 파싱 함수
  const parsePCD = (arrayBuffer: ArrayBuffer): PCDPoint[] => {
    const decoder = new TextDecoder();
    const fullText = decoder.decode(arrayBuffer);
    const lines = fullText.split('\n');
    
    const points: PCDPoint[] = [];
    let fields: string[] = [];
    let size: number[] = [];
    let type: string[] = [];
    let count: number[] = [];
    let dataType = 'ascii';
    let pointsCount = 0;
    let headerEndIndex = -1;
    
    // 헤더 파싱
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('FIELDS')) {
        fields = line.split(' ').slice(1);
      } else if (line.startsWith('SIZE')) {
        size = line.split(' ').slice(1).map(Number);
      } else if (line.startsWith('TYPE')) {
        type = line.split(' ').slice(1);
      } else if (line.startsWith('COUNT')) {
        count = line.split(' ').slice(1).map(Number);
      } else if (line.startsWith('POINTS')) {
        pointsCount = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('DATA')) {
        dataType = line.split(' ')[1];
        headerEndIndex = i;
        break;
      }
    }
    
    if (headerEndIndex === -1) {
      throw new Error('Invalid PCD file: DATA section not found');
    }
    
    if (dataType === 'ascii') {
      // ASCII 데이터 파싱
      for (let i = headerEndIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const values = line.split(/\s+/).map(parseFloat);
        if (values.length >= 3) {
          const point: PCDPoint = { x: values[0], y: values[1], z: values[2] };
          
          // RGB 색상 처리
          if (fields.includes('rgb')) {
            const rgbIdx = fields.indexOf('rgb');
            const rgb = values[rgbIdx];
            const r = ((rgb >> 16) & 0xFF) / 255;
            const g = ((rgb >> 8) & 0xFF) / 255;
            const b = (rgb & 0xFF) / 255;
            point.color = new THREE.Color(r, g, b);
          } else if (fields.includes('r') && fields.includes('g') && fields.includes('b')) {
            const rIdx = fields.indexOf('r');
            const gIdx = fields.indexOf('g');
            const bIdx = fields.indexOf('b');
            point.color = new THREE.Color(
              values[rIdx] / 255,
              values[gIdx] / 255,
              values[bIdx] / 255
            );
          }
          
          points.push(point);
        }
      }
    } else if (dataType === 'binary') {
      // Binary 데이터 파싱 (간단한 버전)
      // 실제 구현에서는 더 복잡한 binary parsing이 필요
      console.warn('Binary PCD files are not fully supported in this implementation');
    }
    
    return points;
  };

  // Point Cloud 생성
  const createPointCloud = (points: PCDPoint[]) => {
    if (!sceneRef.current) return;
    
    // 기존 point cloud 제거
    if (pointCloudRef.current) {
      sceneRef.current.remove(pointCloudRef.current);
      pointCloudRef.current.geometry.dispose();
      if (Array.isArray(pointCloudRef.current.material)) {
        pointCloudRef.current.material.forEach(m => m.dispose());
      } else {
        pointCloudRef.current.material.dispose();
      }
    }
    
    originalPointsRef.current = points;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    
    let hasColors = false;
    const defaultColor = new THREE.Color(1, 1, 1);
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const i3 = i * 3;
      
      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = point.z;
      
      const color = point.color || defaultColor;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      if (point.color) hasColors = true;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: hasColors,
      sizeAttenuation: true
    });
    
    const pointCloud = new THREE.Points(geometry, material);
    pointCloudRef.current = pointCloud;
    sceneRef.current.add(pointCloud);
    
    // 카메라를 포인트 클라우드에 맞춤
    fitCameraToPoints(points);
    
    // 상태 업데이트
    setPointCount(points.length);
  };

  // 카메라를 포인트들에 맞춤
  const fitCameraToPoints = (points: PCDPoint[]) => {
    if (points.length === 0 || !cameraRef.current || !controlsRef.current) return;
    
    const box = new THREE.Box3();
    points.forEach(point => {
      box.expandByPoint(new THREE.Vector3(point.x, point.y, point.z));
    });
    
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    controlsRef.current.target.copy(center);
    cameraRef.current.position.copy(center);
    cameraRef.current.position.x += maxDim * 1.5;
    cameraRef.current.position.y += maxDim * 1.5;
    cameraRef.current.position.z += maxDim * 1.5;
    
    cameraRef.current.lookAt(center);
    controlsRef.current.update();
  };

  // 파일 업로드 처리
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    
    try {
      let arrayBuffer: ArrayBuffer;
      
      if (file.name.endsWith('.gz')) {
        const buffer = await file.arrayBuffer();
        const compressed = new Uint8Array(buffer);
        const decompressed = pako.ungzip(compressed);
        arrayBuffer = decompressed.buffer;
      } else {
        arrayBuffer = await file.arrayBuffer();
      }
      
      const points = parsePCD(arrayBuffer);
      createPointCloud(points);
      setFileName(file.name);
      
    } catch (error) {
      console.error('Error loading PCD file:', error);
      alert('Error loading PCD file: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 포인트 크기 업데이트
  useEffect(() => {
    if (pointCloudRef.current) {
      const material = pointCloudRef.current.material as THREE.PointsMaterial;
      material.size = pointSize;
      if (raycasterRef.current) {
        raycasterRef.current.params.Points!.threshold = Math.max(0.1, pointSize * 0.1);
      }
    }
  }, [pointSize]);

  // 포인트 색상 업데이트
  useEffect(() => {
    if (pointCloudRef.current && !hasOriginalColors()) {
      const threeColor = new THREE.Color(pointColor);
      const geometry = pointCloudRef.current.geometry;
      const colors = geometry.attributes.color.array as Float32Array;
      
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = threeColor.r;
        colors[i + 1] = threeColor.g;
        colors[i + 2] = threeColor.b;
      }
      
      geometry.attributes.color.needsUpdate = true;
    }
  }, [pointColor]);

  const hasOriginalColors = (): boolean => {
    return originalPointsRef.current.some(point => point.color);
  };

  const handleReset = () => {
    if (originalPointsRef.current.length > 0) {
      fitCameraToPoints(originalPointsRef.current);
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      cameraRef.current.position.add(direction.multiplyScalar(1));
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const direction = new THREE.Vector3();
      cameraRef.current.getWorldDirection(direction);
      cameraRef.current.position.add(direction.multiplyScalar(-1));
      controlsRef.current.update();
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Grid container spacing={2}>
        {/* 메인 뷰어 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3, position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                PCD 3D Viewer
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="확대">
                  <IconButton onClick={handleZoomIn} size="small">
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="축소">
                  <IconButton onClick={handleZoomOut} size="small">
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
                <Tooltip title="뷰 리셋">
                  <IconButton onClick={handleReset} size="small">
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <Box
              ref={mountRef}
              sx={{
                width: '100%',
                height: height,
                border: '2px solid #e0e0e0',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
              }}
            />
            
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  p: 2,
                  borderRadius: 2,
                }}
              >
                <Typography>Loading PCD file...</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* 컨트롤 패널 */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            {/* 파일 업로드 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    파일 업로드
                  </Typography>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    PCD 파일 선택
                    <input
                      type="file"
                      hidden
                      accept=".pcd,.pcd.gz"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    파일: {fileName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    포인트 수: {pointCount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 컨트롤 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    표시 설정
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      포인트 크기: {pointSize}
                    </Typography>
                    <Slider
                      value={pointSize}
                      onChange={(_, value) => setPointSize(value as number)}
                      min={0.1}
                      max={10}
                      step={0.1}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      포인트 색상
                    </Typography>
                    <input
                      type="color"
                      value={pointColor}
                      onChange={(e) => setPointColor(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* 툴팁 */}
      {tooltip && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            p: 1.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            zIndex: 1000,
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            좌표:
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            X: {tooltip.point.x.toFixed(3)}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Y: {tooltip.point.y.toFixed(3)}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Z: {tooltip.point.z.toFixed(3)}
          </Typography>
          {tooltip.point.color && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              색상: RGB({Math.round(tooltip.point.color.r * 255)}, {Math.round(tooltip.point.color.g * 255)}, {Math.round(tooltip.point.color.b * 255)})
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PCDViewer;