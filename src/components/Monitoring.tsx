import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import * as pako from 'pako';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Slider,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  CloudUpload,
  RadioButtonChecked,
} from '@mui/icons-material';

interface PCDPoint {
  x: number;
  y: number;
  z: number;
  color?: THREE.Color;
}

interface TooltipData {
  x: number;
  y: number;
  point: PCDPoint;
}

const Monitoring: React.FC = () => {
  // Three.js 관련 refs
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const pointCloudRef = useRef<THREE.Points | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const originalPointsRef = useRef<PCDPoint[]>([]);
  const animationIdRef = useRef<number | null>(null);
  
  // 상태
  const [pointSize, setPointSize] = useState(2);
  const [pointColor, setPointColor] = useState('#ffffff');
  const [pointCount, setPointCount] = useState(0);
  const [fileName, setFileName] = useState('None');
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Three.js 초기화
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 600;

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

    // OrbitControls 동적 로딩
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

    // Raycaster와 Mouse 초기화
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;
    const mouse = new THREE.Vector2();
    mouseRef.current = mouse;

    // 마우스 이벤트 리스너
    const handleMouseMove = (event: MouseEvent) => {
      if (!renderer.domElement || !raycaster || !mouse || !pointCloudRef.current) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
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
    };

    const handleMouseLeave = () => {
      setTooltip(null);
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);

    // 윈도우 리사이즈 핸들러
    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

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
      window.removeEventListener('resize', handleResize);
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, []);

  // PCD 파일 파싱 함수 (원본 HTML과 동일한 로직)
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
    
    // Parse header
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
    
    // Calculate field offsets and total point size
    let fieldOffsets: number[] = [];
    let pointSizeBytes = 0;
    for (let i = 0; i < fields.length; i++) {
      fieldOffsets.push(pointSizeBytes);
      pointSizeBytes += size[i] * (count[i] || 1);
    }
    
    if (dataType === 'binary') {
      // Calculate header size in bytes
      const headerText = lines.slice(0, headerEndIndex + 1).join('\n') + '\n';
      const headerSize = new TextEncoder().encode(headerText).length;
      
      // Create DataView for binary data
      const dataView = new DataView(arrayBuffer, headerSize);
      
      for (let i = 0; i < pointsCount; i++) {
        const point: any = {};
        const baseOffset = i * pointSizeBytes;
        
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j];
          const fieldOffset = baseOffset + fieldOffsets[j];
          const fieldSize = size[j];
          const fieldType = type[j];
          
          let value;
          if (fieldType === 'F') {
            value = dataView.getFloat32(fieldOffset, true); // little-endian
          } else if (fieldType === 'U') {
            if (fieldSize === 4) {
              value = dataView.getUint32(fieldOffset, true);
            } else if (fieldSize === 2) {
              value = dataView.getUint16(fieldOffset, true);
            } else {
              value = dataView.getUint8(fieldOffset);
            }
          } else if (fieldType === 'I') {
            if (fieldSize === 4) {
              value = dataView.getInt32(fieldOffset, true);
            } else if (fieldSize === 2) {
              value = dataView.getInt16(fieldOffset, true);
            } else {
              value = dataView.getInt8(fieldOffset);
            }
          }
          
          point[field] = value;
        }
        
        // Extract coordinates
        const processedPoint: PCDPoint = {
          x: point.x || 0,
          y: point.y || 0,
          z: point.z || 0
        };
        
        // Handle colors
        if (point.rgb !== undefined) {
          const rgb = point.rgb;
          const r = ((rgb >> 16) & 0xFF) / 255;
          const g = ((rgb >> 8) & 0xFF) / 255;
          const b = (rgb & 0xFF) / 255;
          processedPoint.color = new THREE.Color(r, g, b);
        } else if (point.r !== undefined && point.g !== undefined && point.b !== undefined) {
          processedPoint.color = new THREE.Color(
            point.r / 255,
            point.g / 255,
            point.b / 255
          );
        }
        
        points.push(processedPoint);
      }
    } else if (dataType === 'ascii') {
      // ASCII parsing
      for (let i = headerEndIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const values = line.split(/\s+/).map(parseFloat);
        if (values.length >= 3) {
          const point: PCDPoint = { x: values[0], y: values[1], z: values[2] };
          
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
    } else {
      throw new Error(`Unsupported PCD data type: ${dataType}`);
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
    
    // 레이캐스팅을 위한 threshold 설정
    if (raycasterRef.current) {
      raycasterRef.current.params.Points!.threshold = Math.max(0.1, material.size * 0.1);
    }
    
    fitCameraToPoints(points);
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
  const updatePointSize = (size: number) => {
    setPointSize(size);
    if (pointCloudRef.current) {
      const material = pointCloudRef.current.material as THREE.PointsMaterial;
      material.size = size;
      if (raycasterRef.current) {
        raycasterRef.current.params.Points!.threshold = Math.max(0.1, size * 0.1);
      }
    }
  };

  // 포인트 색상 업데이트
  const updatePointColor = (color: string) => {
    setPointColor(color);
    if (pointCloudRef.current && !hasOriginalColors()) {
      const threeColor = new THREE.Color(color);
      const geometry = pointCloudRef.current.geometry;
      const colors = geometry.attributes.color.array as Float32Array;
      
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = threeColor.r;
        colors[i + 1] = threeColor.g;
        colors[i + 2] = threeColor.b;
      }
      
      geometry.attributes.color.needsUpdate = true;
    }
  };

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
    <Grid container spacing={3}>
      {/* PCD 뷰어 메인 영역 */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, borderRadius: 3, height: '70vh', position: 'relative' }}>
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
              height: 'calc(100% - 80px)',
              border: '2px solid #e0e0e0',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
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
                zIndex: 10,
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
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  PCD 파일 업로드
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  파일: {fileName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  포인트 수: {pointCount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 표시 컨트롤 */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3 }}>
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
                    onChange={(_, value) => updatePointSize(value as number)}
                    min={0.1}
                    max={10}
                    step={0.1}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    포인트 색상
                  </Typography>
                  <input
                    type="color"
                    value={pointColor}
                    onChange={(e) => updatePointColor(e.target.value)}
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

          {/* 컨트롤 가이드 */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                컨트롤 가이드
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • 마우스 드래그: 회전
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • 마우스 휠: 줌 인/아웃
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • 우클릭 드래그: 팬
              </Typography>
              <Typography variant="body2">
                • 포인트 hover: 좌표 표시
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Grid>

      {/* 툴팁 */}
      {tooltip && (
        <Box
          sx={{
            position: 'fixed',
            left: Math.min(tooltip.x + 10, window.innerWidth - 200),
            top: Math.max(tooltip.y - 10, 10),
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
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
              색상: RGB({Math.round(tooltip.point.color.r * 255)}, {Math.round(tooltip.point.color.g * 255)}, {Math.round(tooltip.point.color.b * 255)})
            </Typography>
          )}
        </Box>
      )}
    </Grid>
  );
};

export default Monitoring;