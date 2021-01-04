import "./Globe.scss";
import {useEffect, useMemo, useState} from "react";
import {
    AmbientLight,
    Color, DirectionalLight,
    PerspectiveCamera,
    Renderer,
    Scene,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import ThreeGlobe from "three-globe";
import {Airport, AirportResponse, Telex, TelexConnection} from "@flybywiresim/api-client";

const Globe = (props: any) => {
    const [mount, setMount] = useState<HTMLDivElement | null>();
    const [rendererState, setRender] = useState<Renderer>();
    const airportsCache = useMemo<Map<string, AirportResponse>>(() => new Map(), []);

    useEffect(() => {
        buildScene();
    }, [mount]);

    async function fetchAirports(connections: TelexConnection[]) {
        return Promise.all(connections.map(async conn => {
            if (!!conn.origin && !!conn.destination) {
                try {
                    let arptOrigin = airportsCache.get(conn.origin);
                    console.log(arptOrigin);
                    if (!arptOrigin) {
                        arptOrigin = await Airport.get(conn.origin);
                        airportsCache.set(conn.origin, arptOrigin);
                    }
                    let arptDest = airportsCache.get(conn.destination);
                    console.log(arptDest);
                    if (!arptDest) {
                        arptDest = await Airport.get(conn.destination);
                        airportsCache.set(conn.destination, arptDest);
                    }

                    console.log("Fetch ARPT done");
                    return {
                        startLat: arptOrigin.lat,
                        startLng: arptOrigin.lon,
                        endLat: arptDest.lat,
                        endLng: arptDest.lon,
                        color: "00C2CB",
                    };
                } catch (_) {}
            }
        }));
    }

    async function buildScene() {
        if (!mount) {
            return;
        }

        if (rendererState) {
            mount.removeChild(rendererState.domElement);
        }

        const width = mount.clientWidth;
        const height = mount.clientHeight;

        // Scene
        const scene = new Scene();

        // Renderer
        const renderer = new WebGLRenderer({antialias: true, alpha: true});
        renderer.setClearColor("#fff", 0);
        renderer.setSize(width, height);
        mount.appendChild(renderer.domElement);
        setRender(renderer);

        // Camera
        const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 220;

        // Camera Controls
        new OrbitControls(camera, renderer.domElement);

        // Lights
        scene.add(new AmbientLight(0xbbbbbb));
        scene.add(new DirectionalLight(0xffffff, 0.6));

        const globe = new ThreeGlobe();
        const globeMaterial = globe.globeMaterial();
        globeMaterial.color = new Color("#152346");

        fetch('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/hexed-polygons/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(async countries => {

                globe
                    .hexPolygonsData(countries.features)
                    .hexPolygonResolution(3)
                    .hexPolygonMargin(0.85)
                    .hexPolygonColor(() => "#fff");

                let connections: TelexConnection[] = [];
                try {
                    connections = await Telex.fetchAllConnections();
                } catch (e) {
                    console.error(e);
                }

                const arcsData: any[] = (await fetchAirports(connections)).filter(c => c !== undefined);

                globe
                    .arcsData(arcsData || [])
                    .arcColor("color")
                    .arcDashLength(1.5)
                    .arcDashGap(2)
                    .arcStroke(0.75)
                    .arcDashInitialGap(() => Math.random() * 3)
                    .arcDashAnimateTime(2000);
                // .arcAltitudeAutoScale(0.2);

                scene.add(globe);
            });

        let frameId = 0;
        const animate = () => {
            //ReDraw Scene with Camera and Scene Object
            globe.rotation.y += 0.002;

            renderScene();
            frameId = window.requestAnimationFrame(animate);
        };

        const startAnimation = () => {
            if (frameId === 0) {
                frameId = requestAnimationFrame(animate);
            }
        };

        const stopAnimation = () => {
            cancelAnimationFrame(frameId);
        };

        const renderScene = () => {
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        };

        renderScene();
        startAnimation();
    }

    return (
        <div
            className={"render-target"}
            ref={mount => setMount(mount)}
        />
    );
};

export default Globe;
