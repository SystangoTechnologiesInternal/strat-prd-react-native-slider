'use strict';

import React, {
  PureComponent,
} from "react";

import {
  Animated,
  Image,
  StyleSheet,
  PanResponder,
  View,
  Easing,
  Text,
  ViewPropTypes
} from "react-native";

import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Entypo';
import LinearGradient from 'react-native-linear-gradient';

var TRACK_SIZE = 4;
var THUMB_SIZE = 20;
var currenNumber = 0;

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

Rect.prototype.containsPoint = function(x, y) {
  return (x >= this.x
          && y >= this.y
          && x <= this.x + this.width
          && y <= this.y + this.height);
};

var DEFAULT_ANIMATION_CONFIGS = {
  spring : {
    friction : 7,
    tension  : 100
  },
  timing : {
    duration : 150,
    easing   : Easing.inOut(Easing.ease),
    delay    : 0
  },
  // decay : { // This has a serious bug
  //   velocity     : 1,
  //   deceleration : 0.997
  // }
};

let markerWidth = 12; // 14
let boxFont = 8;  //9
let boxHeight = 50;  //9

export default class Slider extends PureComponent {
  static propTypes = {
    /**
     * Initial value of the slider. The value should be between minimumValue
     * and maximumValue, which default to 0 and 1 respectively.
     * Default value is 0.
     *
     * *This is not a controlled component*, e.g. if you don't update
     * the value, the component won't be reset to its inital value.
     */
    value: PropTypes.number,

    /**
     * If true the user won't be able to move the slider.
     * Default value is false.
     */
    disabled: PropTypes.bool,

    /**
     * Initial minimum value of the slider. Default value is 0.
     */
    minimumValue: PropTypes.number,

    /**
     * Initial maximum value of the slider. Default value is 1.
     */
    maximumValue: PropTypes.number,

    /**
     * Step value of the slider. The value should be between 0 and
     * (maximumValue - minimumValue). Default value is 0.
     */
    step: PropTypes.number,

    /**
     * The color used for the track to the left of the button. Overrides the
     * default blue gradient image.
     */
    minimumTrackTintColor: PropTypes.string,

    /**
     * The color used for the track to the right of the button. Overrides the
     * default blue gradient image.
     */
    maximumTrackTintColor: PropTypes.string,

    /**
     * The color used for the thumb.
     */
    thumbTintColor: PropTypes.string,

    /**
     * The size of the touch area that allows moving the thumb.
     * The touch area has the same center has the visible thumb.
     * This allows to have a visually small thumb while still allowing the user
     * to move it easily.
     * The default is {width: 40, height: 40}.
     */
    thumbTouchSize: PropTypes.shape(
      {width: PropTypes.number, height: PropTypes.number}
    ),

    /**
     * Callback continuously called while the user is dragging the slider.
     */
    onValueChange: PropTypes.func,

    /**
     * Callback called when the user starts changing the value (e.g. when
     * the slider is pressed).
     */
    onSlidingStart: PropTypes.func,

    /**
     * Callback called when the user finishes changing the value (e.g. when
     * the slider is released).
     */
    onSlidingComplete: PropTypes.func,

    /**
     * The style applied to the slider container.
     */
    style: ViewPropTypes.style,

    /**
     * The style applied to the track.
     */
    trackStyle: ViewPropTypes.style,

    /**
     * The style applied to the thumb.
     */
    thumbStyle: ViewPropTypes.style,

    /**
     * Sets an image for the thumb.
     */
    thumbImage: Image.propTypes.source,

    /**
     * Set this to true to visually see the thumb touch rect in green.
     */
    debugTouchArea: PropTypes.bool,

    /**
     * Set to true to animate values with default 'timing' animation type
     */
    animateTransitions : PropTypes.bool,

    /**
     * Custom Animation type. 'spring' or 'timing'.
     */
    animationType : PropTypes.oneOf(['spring', 'timing']),

    /**
     * Used to configure the animation parameters.  These are the same parameters in the Animated library.
     */
    animationConfig : PropTypes.object,
  };

  static defaultProps = {
    value: 0,
    minimumValue: 0,
    maximumValue: 1,
    step: 0,
    minimumTrackTintColor: '#3f3f3f',
    maximumTrackTintColor: '#b3b3b3',
    thumbTintColor: '#343434',
    thumbTouchSize: {width: 40, height: 40},
    debugTouchArea: false,
    animationType: 'timing'
  };

  state = {
    containerSize: {width: 0, height: 0},
    trackSize: {width: 0, height: 0},
    thumbSize: {width: 0, height: 0},
    allMeasured: false,
    value: new Animated.Value(this.props.value),
  };

  componentWillMount() {

        markerWidth = this.props.boxTextFont + 5; // 14
        boxFont = this.props.boxTextFont - (this.props.boxTextFont/4) - 1.5;  //9
        boxHeight = this.props.boxTextFont * 4;  //9

    currenNumber = this.props.value;

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminationRequest: this._handlePanResponderRequestEnd,
      onPanResponderTerminate: this._handlePanResponderEnd,
    });
  };

  componentWillReceiveProps(nextProps) {
    var newValue = nextProps.value;

    if (this.props.value !== newValue) {
      currenNumber = newValue;
      if (this.props.animateTransitions) {
        this._setCurrentValueAnimated(newValue);
      }
      else {
        this._setCurrentValue(newValue);
      }
    }
  };

  render() {
    var {
      minimumValue,
      maximumValue,
      minimumTrackTintColor,
      maximumTrackTintColor,
      thumbTintColor,
      thumbImage,
      styles,
      style,
      trackStyle,
      thumbStyle,
      debugTouchArea,
      ...other
    } = this.props;
    var {value, containerSize, trackSize, thumbSize, allMeasured} = this.state;
    var mainStyles = styles || defaultStyles;
    var thumbLeft = value.interpolate({
      inputRange: [minimumValue, maximumValue],
      outputRange: [0, (this.props.Device.isTablet)?(this.props.OS == 'ios')?containerSize.width - thumbSize.width-8:containerSize.width - thumbSize.width - 5:containerSize.width - thumbSize.width],
      //extrapolate: 'clamp',
    });
    var valueVisibleStyle = {};
    if (!allMeasured) {
      valueVisibleStyle.opacity = 0;
    }

    var minimumTrackStyle = {
      position: 'absolute',
      width: Animated.add(thumbLeft, thumbSize.width / 2),
      backgroundColor: 'white',
      ...valueVisibleStyle
    };

    var touchOverflowStyle = this._getTouchOverflowStyle();
    return (
    <View {...other} style={[mainStyles.container, style, {marginLeft:0, height:90, width:this.props.width }]} onLayout={this._measureContainer}>
        <View
          style={[{backgroundColor: '#B8B8B8'}, mainStyles.track, trackStyle, {flexDirection:'row', height:20, justifyContent:'center', alignItems:'center'}]}
          renderToHardwareTextureAndroid={true}
          onLayout={this._measureTrack} >
          </View>
          <Animated.View
          renderToHardwareTextureAndroid={true}
          style={[mainStyles.track, trackStyle, minimumTrackStyle, {height:20, backgroundColor:'#F57B20'}]} />
        <Animated.View
          onLayout={this._measureThumb}
          renderToHardwareTextureAndroid={true}
          style={[
            mainStyles.thumb, thumbStyle,
            {
              transform: [
                { translateX: thumbLeft },
                { translateY: 0 }
              ],
              ...valueVisibleStyle,
              position:'absolute',
              height:80,
              width:(this.props.maximumValue<25)?markerWidth + 12:markerWidth + 10 //Adjust sliderbox according to the points
            }
          ]}
        >
          <Text style={{alignSelf:'center', fontSize:boxFont+3, color:'black',marginRight:2}}>
            {(this.state.touchSlider)?Math.round(currenNumber):'  '}
          </Text>
          {this._renderThumbImage()}
        </Animated.View>
        <View
          renderToHardwareTextureAndroid={true}
          style={[defaultStyles.touchArea, touchOverflowStyle]}
          {...this._panResponder.panHandlers}>
        </View>
        {debugTouchArea === true && this._renderDebugThumbTouchRect(thumbLeft)}
        {this.props.disabled?<View style={{position:'absolute', top:0, bottom:0, right:0, left:0, backgroundColor:'rgba(0,0,0, 0.001)'}}/>:<View/>}
      </View>
    );
  };

  // renderNumberView() {
  //   let view = []

  //   for (let index = this.props.maximumValue <= 15 ? 1 : this.props.maximumValue/10; index <= this.props.maximumValue; index = index + (this.props.maximumValue <= 15 ? 1 : 2)) {
  //     view.push(<View style={{width:boxWidth, height: boxHeight / 2, backgroundColor:'transparent', flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
  //       <Text style={{alignSelf:'center', fontSize:boxFont}}>
  //         {index}
  //       </Text>
  //     </View>
  //     ) 
  //   }
  //   return <LinearGradient 
  //             start={{x: 0.0, y: 1.0}} end={{x: .80, y: 1.0}}
  //             colors={['#ffffff', '#ffffff', '#efeaea', '#efeaea', '#efeaea', '#ffffff']}
  //             style={{flexDirection:'row', borderColor:'#ededed', borderWidth:0.5, paddingLeft:(boxWidth/4) + 5, marginRight:0}}>
  //               {view}
  //          </LinearGradient>
  // }

  _renderThumbImage = () => {

    return <View style={{marginLeft: -1, width:markerWidth + 5, justifyContent:'center', alignItems:'center', height:(this.props.Device.isTablet)?(this.props.Device.isSmallTablet)?45:40:50}}>
            <Icon name="triangle-down" size={18} color={'#F57B20'}/>
            <View style={{width:markerWidth, height: (boxHeight / 2), backgroundColor:'#F57B20', flexDirection:'row', justifyContent:'center', alignItems:'center', marginTop:-6, borderWidth:0.5, borderColor:'#b24d01'}}>
              <Text style={{alignSelf:'center', fontSize:boxFont, color:'white'}}>
                {Math.round(currenNumber)}
              </Text>
            </View>
            <Icon name="triangle-up" size={18} color={'#F57B20'} style={{marginTop:-5.7}}/>
          </View>;
  };

  _getPropsForComponentUpdate(props) {
    var {
      value,
      onValueChange,
      onSlidingStart,
      onSlidingComplete,
      style,
      trackStyle,
      thumbStyle,
      ...otherProps,
    } = props;

    return otherProps;
  };

  _handleStartShouldSetPanResponder = (e: Object, gestureState: Object): boolean => {
    // Should we become active when the user presses down on the thumb?
    
    var updatedValue = this._getTouchValue(e)

    this._setCurrentValue(updatedValue);
    this._fireChangeEvent('onValueChange');

    return true;
  };

  _handleMoveShouldSetPanResponder(/*e: Object, gestureState: Object*/): boolean {
    // Should we become active when the user moves a touch over the thumb?
    console.log('#2')
    return true;
  };

  _handlePanResponderGrant = (/*e: Object, gestureState: Object*/) => {

    console.log('#3')
    this.setState({touchSlider:true})
    this._previousLeft = this._getThumbLeft(this._getCurrentValue());
    this._fireChangeEvent('onSlidingStart');
  };

  _handlePanResponderMove = (e: Object, gestureState: Object) => {
    
    if (this.props.disabled) {
      return;
    }

    var updatedValue = this._getValue(gestureState);

        this._setCurrentValue(updatedValue);
      this._fireChangeEvent('onValueChange');
   
  };

  _handlePanResponderRequestEnd(e: Object, gestureState: Object) {
    
    // Should we allow another component to take over this pan?
    return true;
  };

  _handlePanResponderEnd = (e: Object, gestureState: Object) => {
    if (this.props.disabled) {
      return;
    }
    this._setCurrentValue(Math.round(currenNumber));
    this.setState({touchSlider:false})
    this._fireChangeEvent('onSlidingComplete');
  };

  _measureContainer = (x: Object) => {
    this._handleMeasure('containerSize', x);
  };

  _measureTrack = (x: Object) => {
    this._handleMeasure('trackSize', x);
  };

  _measureThumb = (x: Object) => {
    this._handleMeasure('thumbSize', x);
  };

  _handleMeasure = (name: string, x: Object) => {
    var {width, height} = x.nativeEvent.layout;
    var size = {width: width, height: height};

    var storeName = `_${name}`;
    var currentSize = this[storeName];
    if (currentSize && width === currentSize.width && height === currentSize.height) {
      return;
    }
    this[storeName] = size;

    if (this._containerSize && this._trackSize && this._thumbSize) {
      this.setState({
        containerSize: this._containerSize,
        trackSize: this._trackSize,
        thumbSize: this._thumbSize,
        allMeasured: true,
      })
    }
  };

  _getRatio = (value: number) => {
    return (value - this.props.minimumValue) / ((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1) - this.props.minimumValue);
  };

  _getThumbLeft = (value: number) => {
    var ratio = this._getRatio(value);
    return ratio * (this.state.containerSize.width - this.state.thumbSize.width);
  };

  _getValue = (gestureState: Object) => {
    var length = this.state.containerSize.width - this.state.thumbSize.width;
    var thumbLeft = this._previousLeft + gestureState.dx;

    var ratio = thumbLeft / length;

    if (this.props.step) {
      return Math.max(this.props.minimumValue,
        Math.min((this.props.maximumValue < 20 ? this.props.maximumValue : this.props.maximumValue + 1),
          this.props.minimumValue + Math.round(ratio * ((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1) - this.props.minimumValue) / this.props.step) * this.props.step
        )
      );
    } else {
      return Math.max(this.props.minimumValue,
        Math.min((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1),
          ratio * ((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1) - this.props.minimumValue) + this.props.minimumValue
        )
      );
    }
  };

  _getTouchValue = (e: Object) => {
    var length = this.state.containerSize.width;
    var thumbLeft = e.nativeEvent.locationX;

    var ratio = thumbLeft / length;

    if (this.props.step) {
      return Math.max(this.props.minimumValue,
        Math.min((this.props.maximumValue < 20 ? this.props.maximumValue : this.props.maximumValue + 1),
          this.props.minimumValue + Math.round(ratio * ((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1) - this.props.minimumValue) / this.props.step) * this.props.step
        )
      );
    } else {
      return Math.max(this.props.minimumValue,
        Math.min((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1),
          ratio * ((this.props.maximumValue <= 15 ? this.props.maximumValue : this.props.maximumValue + 1) - this.props.minimumValue) + this.props.minimumValue
        )
      );
    }
  };

  _getCurrentValue = () => {
    currenNumber = this.state.value.__getValue();
    return currenNumber;
  };

  _setCurrentValue = (value: number) => {
    this.state.value.setValue(value);
  };

  _setCurrentValueAnimated = (value: number) => {
    var animationType   = this.props.animationType;
    var animationConfig = Object.assign(
      {},
      DEFAULT_ANIMATION_CONFIGS[animationType],
      this.props.animationConfig,
      {toValue : value}
    );

    Animated[animationType](this.state.value, animationConfig).start();
  };

  _fireChangeEvent = (event) => {
    if (this.props[event]) {
      this.props[event](this._getCurrentValue());
    }
  };

  _getTouchOverflowSize = () => {
    var state = this.state;
    var props = this.props;

    var size = {};
    if (state.allMeasured === true) {
      size.width = Math.max(0, props.thumbTouchSize.width - state.thumbSize.width);
      size.height = Math.max(0, props.thumbTouchSize.height - state.containerSize.height);
    }

    return size;
  };

  _getTouchOverflowStyle = () => {
    var {width, height} = this._getTouchOverflowSize();

    var touchOverflowStyle = {};
    if (width !== undefined && height !== undefined) {
      var verticalMargin = -height / 2;
      touchOverflowStyle.marginTop = verticalMargin;
      touchOverflowStyle.marginBottom = verticalMargin;

      var horizontalMargin = -width / 2;
      touchOverflowStyle.marginLeft = horizontalMargin;
      touchOverflowStyle.marginRight = horizontalMargin;
    }

    if (this.props.debugTouchArea === true) {
      touchOverflowStyle.backgroundColor = 'orange';
      touchOverflowStyle.opacity = 0.5;
    }

    return touchOverflowStyle;
  };

  _thumbHitTest = (e: Object) => {
    var nativeEvent = e.nativeEvent;
    var thumbTouchRect = this._getThumbTouchRect();
    return thumbTouchRect.containsPoint(nativeEvent.locationX, nativeEvent.locationY);
  };

  _getThumbTouchRect = () => {
    var state = this.state;
    var props = this.props;
    var touchOverflowSize = this._getTouchOverflowSize();

    return new Rect(
      touchOverflowSize.width / 2 + this._getThumbLeft(this._getCurrentValue()) + (state.thumbSize.width - props.thumbTouchSize.width) / 2,
      touchOverflowSize.height / 2 + (state.containerSize.height - props.thumbTouchSize.height) / 2,
      props.thumbTouchSize.width,
      props.thumbTouchSize.height
    );
  };

  _renderDebugThumbTouchRect = (thumbLeft) => {
    var thumbTouchRect = this._getThumbTouchRect();
    var positionStyle = {
      left: thumbLeft,
      top: thumbTouchRect.y,
      width: thumbTouchRect.width,
      height: thumbTouchRect.height,
    };

    return (
      <Animated.View
        style={[defaultStyles.debugThumbTouchArea, positionStyle]}
        pointerEvents='none'
      />
    );
  };

}

var defaultStyles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_SIZE,
    borderRadius: TRACK_SIZE / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  touchArea: {
    position: 'absolute',
    backgroundColor: 'transparent',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  debugThumbTouchArea: {
    position: 'absolute',
    backgroundColor: 'green',
    opacity: 0.5,
  }
});
