"use client";

import { ReactNode, useRef } from "react";
import { useResize } from "../../../_hooks/useResize";
import styles from "./Resizable.module.scss";

interface Props {
   children: ReactNode;
   className?: string;
}

const KEYBOARD_STEP = 24;

export function Resizable({ children, className = "" }: Props) {
   const wrapperRef = useRef<HTMLDivElement>(null);
   const { dimensions, startResize, resizeBy, reset } = useResize({
      ref: wrapperRef,
   });

   return (
      <div
         ref={wrapperRef}
         className={`${styles.wrapper} ${className}`}
         style={{
            width: dimensions.width,
            height: dimensions.height,
         }}
      >
         {children}

         <button
            type="button"
            aria-label="Resize width"
            onMouseDown={(e) => startResize(e, "horizontal")}
            onDoubleClick={() => reset("horizontal")}
            onKeyDown={(e) => {
               if (e.key === "ArrowRight") {
                  e.preventDefault();
                  resizeBy("horizontal", KEYBOARD_STEP);
               }
               if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  resizeBy("horizontal", -KEYBOARD_STEP);
               }
               if (e.key === "Enter") {
                  reset("horizontal");
               }
            }}
            className={styles.rightHandle}
         >
            <span className={`${styles.handle} ${styles.horizontal}`}>
               <span className={styles.indicator} />
            </span>
         </button>

         <button
            type="button"
            aria-label="Resize height"
            onMouseDown={(e) => startResize(e, "vertical")}
            onDoubleClick={() => reset("vertical")}
            onKeyDown={(e) => {
               if (e.key === "ArrowDown") {
                  e.preventDefault();
                  resizeBy("vertical", KEYBOARD_STEP);
               }
               if (e.key === "ArrowUp") {
                  e.preventDefault();
                  resizeBy("vertical", -KEYBOARD_STEP);
               }
               if (e.key === "Enter") {
                  reset("vertical");
               }
            }}
            className={styles.bottomHandle}
         >
            <span className={`${styles.handle} ${styles.vertical}`}>
               <span className={styles.indicator} />
            </span>
         </button>
      </div>
   );
}

export default Resizable;
